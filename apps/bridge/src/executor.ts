import { spawn, exec } from 'child_process';
import { ActionPayload, ActionType } from '@smartdeck/protocol';

export async function executeAction(type: ActionType, payload: ActionPayload): Promise<{ success: boolean; error?: string }> {
  console.log(`Executing action type: ${type}`, payload);

  try {
    switch (type) {
      case 'launch_app': {
        if (!payload.path) {
          return { success: false, error: 'Path is required' };
        }
        const args = payload.args || [];
        // Spawn process detached so bridge doesn't block or close when app closes
        const child = spawn(payload.path, args, {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        return { success: true };
      }

      case 'open_url': {
        if (!payload.url) {
          return { success: false, error: 'URL is required' };
        }
        // Validate URL format to prevent command injection
        const urlString = payload.url.trim();
        if (!/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(urlString)) {
          return { success: false, error: 'Invalid URL format' };
        }
        // Use cmd.exe start to open URL in default browser safely
        const safeUrl = urlString.replace(/[&^]/g, '^$&'); // Escape special cmd characters
        exec(`start "" "${safeUrl}"`);
        return { success: true };
      }

      case 'shortcut': {
        if (!payload.keys || payload.keys.length === 0) {
          return { success: false, error: 'Keys are required' };
        }
        // Simulate keystrokes using a PowerShell script
        const keysString = payload.keys.join('+').toLowerCase();
        
        // Parse shortcuts like ctrl+c, alt+tab, win+r
        // WScript.Shell SendKeys format:
        // + = Shift, ^ = Ctrl, % = Alt, {F1}, etc.
        let psKeys = '';
        let hasWinKey = false;
        
        for (const k of payload.keys) {
          const key = k.toLowerCase().trim();
          if (key === 'ctrl' || key === 'control') psKeys += '^';
          else if (key === 'alt') psKeys += '%';
          else if (key === 'shift') psKeys += '+';
          else if (key === 'win' || key === 'windows' || key === 'cmd') {
            hasWinKey = true;
          } else {
            // Handle special keys
            if (key === 'enter') psKeys += '{ENTER}';
            else if (key === 'tab') psKeys += '{TAB}';
            else if (key === 'escape' || key === 'esc') psKeys += '{ESC}';
            else if (key === 'backspace') psKeys += '{BACKSPACE}';
            else if (key === 'space') psKeys += ' ';
            else if (key.startsWith('f') && !isNaN(Number(key.slice(1)))) {
              psKeys += `{${key.toUpperCase()}}`;
            } else {
              psKeys += `{${key.toUpperCase()}}`;
            }
          }
        }

        let command = '';
        if (hasWinKey) {
          // SendKeys doesn't support the Win key easily. We use standard C# SendInput in PowerShell.
          // For simple shortcuts, let's inject a standard keybd_event code via PowerShell.
          command = `
            $code = @'
            using System;
            using System.Runtime.InteropServices;
            public class KeyInput {
                [DllImport("user32.dll")]
                public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
            }
            '@
            Add-Type -TypeDefinition $code
            # Press Win key (0x5B = 91)
            [KeyInput]::keybd_event(91, 0, 0, 0)
            # Press rest of keys if any
            # For MVP, handle common ones: win+r, win+d
          `;
          // Map rest of keys
          const otherKeys = payload.keys.filter(k => !['win', 'windows', 'cmd'].includes(k.toLowerCase()));
          for (const k of otherKeys) {
            const code = getVirtualKeyCode(k);
            if (code) {
              command += `\n[KeyInput]::keybd_event(${code}, 0, 0, 0)`; // down
              command += `\n[KeyInput]::keybd_event(${code}, 0, 2, 0)`; // up
            }
          }
          command += `\n[KeyInput]::keybd_event(91, 0, 2, 0)`; // release Win key
        } else {
          command = `
            $ws = New-Object -ComObject WScript.Shell;
            $ws.SendKeys('${psKeys}');
          `;
        }

        exec(`powershell -Command "${command.replace(/\n/g, ' ')}"`);
        return { success: true };
      }

      case 'text': {
        if (!payload.text) {
          return { success: false, error: 'Text is required' };
        }
        // Set clipboard text and paste it (most reliable way to inject unicode/long text)
        const safeText = payload.text.replace(/'/g, "''");
        const command = `
          Add-Type -AssemblyName System.Windows.Forms;
          [System.Windows.Forms.Clipboard]::SetText('${safeText}');
          $ws = New-Object -ComObject WScript.Shell;
          $ws.SendKeys('^v');
        `;
        exec(`powershell -Command "${command.replace(/\n/g, ' ')}"`);
        return { success: true };
      }

      case 'media': {
        if (!payload.mediaCommand) {
          return { success: false, error: 'mediaCommand is required' };
        }
        // Virtual Key codes for media controls:
        // Mute: 173 (0xAD), Volume Down: 174 (0xAE), Volume Up: 175 (0xAF)
        // Next: 176 (0xB0), Prev: 177 (0xB1), Stop: 178 (0xB2), Play/Pause: 179 (0xB3)
        let vk = 0;
        switch (payload.mediaCommand) {
          case 'play':
          case 'pause':
            vk = 179;
            break;
          case 'next':
            vk = 176;
            break;
          case 'prev':
            vk = 177;
            break;
          case 'mute':
            vk = 173;
            break;
          case 'vol_up':
            vk = 175;
            break;
          case 'vol_down':
            vk = 174;
            break;
        }

        if (vk > 0) {
          const command = `
            $code = @'
            using System;
            using System.Runtime.InteropServices;
            public class Media {
                [DllImport("user32.dll")]
                public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
            }
            '@
            Add-Type -TypeDefinition $code
            [Media]::keybd_event(${vk}, 0, 0, 0)
            [Media]::keybd_event(${vk}, 0, 2, 0)
          `;
          exec(`powershell -Command "${command.replace(/\n/g, ' ')}"`);
          return { success: true };
        }
        return { success: false, error: 'Unknown media command' };
      }

      case 'http': {
        if (!payload.httpUrl) {
          return { success: false, error: 'HTTP URL is required' };
        }
        const method = payload.httpMethod || 'GET';
        const headers = payload.httpHeaders || {};
        const body = payload.httpBody || undefined;

        const res = await fetch(payload.httpUrl, {
          method,
          headers,
          body: method !== 'GET' ? body : undefined
        });

        if (!res.ok) {
          return { success: false, error: `HTTP Request failed with status ${res.status}` };
        }
        return { success: true };
      }

      default:
        return { success: false, error: `Unsupported action type: ${type}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

function getVirtualKeyCode(key: string): number {
  const k = key.toLowerCase().trim();
  if (k === 'a') return 65;
  if (k === 'b') return 66;
  if (k === 'c') return 67;
  if (k === 'd') return 68;
  if (k === 'e') return 69;
  if (k === 'f') return 70;
  if (k === 'g') return 71;
  if (k === 'h') return 72;
  if (k === 'i') return 73;
  if (k === 'j') return 74;
  if (k === 'k') return 75;
  if (k === 'l') return 76;
  if (k === 'm') return 77;
  if (k === 'n') return 78;
  if (k === 'o') return 79;
  if (k === 'p') return 80;
  if (k === 'q') return 81;
  if (k === 'r') return 82;
  if (k === 's') return 83;
  if (k === 't') return 84;
  if (k === 'u') return 85;
  if (k === 'v') return 86;
  if (k === 'w') return 87;
  if (k === 'x') return 88;
  if (k === 'y') return 89;
  if (k === 'z') return 90;
  if (k === 'enter') return 13;
  if (k === 'tab') return 9;
  if (k === 'escape' || k === 'esc') return 27;
  if (k === 'space') return 32;
  return 0;
}
