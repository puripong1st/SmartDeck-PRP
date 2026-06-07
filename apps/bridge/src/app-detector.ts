import { exec } from 'child_process';
import { getDb } from './db';
import { AppDetectionRule } from '@smartdeck/protocol';

let detectionInterval: NodeJS.Timeout | null = null;
let currentActiveProfileId: string = 'p_fallback';
let onProfileChangeCallback: ((profileId: string) => void) | null = null;

// Clean PowerShell script to get foreground window process and title
const GET_FOREGROUND_SCRIPT = `
$code = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
}
'@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$hwnd = [Win32]::GetForegroundWindow()
if ($hwnd -ne [IntPtr]::Zero) {
    $pid = 0
    [Win32]::GetWindowThreadProcessId($hwnd, [ref]$pid)
    if ($pid -gt 0) {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            $title = New-Object System.Text.StringBuilder 256
            [Win32]::GetWindowText($hwnd, $title, 256) | Out-Null
            [PSCustomObject]@{
                processName = $process.ProcessName
                windowTitle = $title.ToString()
            } | ConvertTo-Json -Compress
        }
    }
}
`.trim().replace(/\n/g, ' ');

interface WindowInfo {
  processName: string;
  windowTitle: string;
}

export function startAppDetection(callback: (profileId: string) => void) {
  onProfileChangeCallback = callback;
  if (detectionInterval) return;

  detectionInterval = setInterval(async () => {
    try {
      const info = await getForegroundWindowInfo();
      if (!info) return;

      const matchedProfileId = await matchProfile(info.processName, info.windowTitle);
      if (matchedProfileId && matchedProfileId !== currentActiveProfileId) {
        console.log(`[AppDetector] Switching active profile to: ${matchedProfileId} (Matched: ${info.processName} - ${info.windowTitle})`);
        currentActiveProfileId = matchedProfileId;
        if (onProfileChangeCallback) {
          onProfileChangeCallback(matchedProfileId);
        }
      }
    } catch (err) {
      // Quietly catch detection errors to prevent bridge crashing
    }
  }, 2000);
}

export function stopAppDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

export function setManualProfile(profileId: string) {
  currentActiveProfileId = profileId;
}

export function getCurrentProfileId(): string {
  return currentActiveProfileId;
}

function getForegroundWindowInfo(): Promise<WindowInfo | null> {
  return new Promise((resolve) => {
    exec(`powershell -Command "${GET_FOREGROUND_SCRIPT}"`, (err, stdout) => {
      if (err || !stdout.trim()) {
        return resolve(null);
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve({
          processName: parsed.processName || '',
          windowTitle: parsed.windowTitle || '',
        });
      } catch {
        resolve(null);
      }
    });
  });
}

async function matchProfile(processName: string, windowTitle: string): Promise<string | null> {
  const db = await getDb();
  
  // Get all active rules ordered by priority desc
  const rules = await db.all<AppDetectionRule[]>(
    'SELECT id, profileId, processName, windowTitlePattern, priority FROM app_detection_rules ORDER BY priority DESC'
  );

  const procLower = processName.toLowerCase();
  const titleLower = windowTitle.toLowerCase();

  for (const rule of rules) {
    let match = false;
    
    // Check process name
    if (rule.processName) {
      if (procLower === rule.processName.toLowerCase() || `${procLower}.exe` === rule.processName.toLowerCase()) {
        match = true;
      }
    }

    // Check window title pattern
    if (rule.windowTitlePattern && rule.windowTitlePattern.trim()) {
      const pattern = rule.windowTitlePattern.toLowerCase();
      // Simple wildcard check or substring check
      if (titleLower.includes(pattern)) {
        match = true;
      }
    }

    if (match) {
      return rule.profileId;
    }
  }

  // Fallback to fallback profile
  const fallback = await db.get<{ id: string }>('SELECT id FROM profiles WHERE is_fallback = 1');
  return fallback ? fallback.id : null;
}
