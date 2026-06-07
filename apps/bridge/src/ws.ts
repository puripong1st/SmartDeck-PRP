import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { 
  MessageEnvelope, 
  PROTOCOL_VERSION, 
  DeviceHelloPayload, 
  ButtonEventPayload, 
  ActionExecutePayload,
  MessageEnvelopeSchema
} from '@smartdeck/protocol';
import { getDb } from './db';
import { executeAction } from './executor';
import { getCurrentProfileId, setManualProfile } from './app-detector';

interface ConnectedClient {
  ws: WebSocket;
  type: 'web' | 'device';
  deviceId?: string;
}

let wss: WebSocketServer | null = null;
const clients = new Set<ConnectedClient>();

export function initWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server, path: '/events' });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');
    let clientRecord: ConnectedClient = { ws, type: 'web' }; // default type is web
    clients.add(clientRecord);

    ws.on('message', async (data) => {
      try {
        const rawJson = JSON.parse(data.toString());
        const result = MessageEnvelopeSchema.safeParse(rawJson);
        if (!result.success) {
          console.warn('[WebSocket] Invalid protocol envelope', result.error);
          return;
        }

        const msg = result.data;
        await handleMessage(clientRecord, msg);
      } catch (err) {
        console.error('[WebSocket] Error processing message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      clients.delete(clientRecord);
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Socket error:', err);
    });
  });

  // Start checking system widgets updates (mocking CPU, RAM updates for MVP)
  setInterval(async () => {
    await broadcastWidgetUpdates();
  }, 3000);
}

async function handleMessage(client: ConnectedClient, msg: MessageEnvelope) {
  const db = await getDb();

  switch (msg.type) {
    case 'device.hello': {
      const payload = msg.payload as DeviceHelloPayload;
      client.type = 'device';
      client.deviceId = payload.deviceId;
      console.log(`[WebSocket] Device registered: ${payload.deviceId} (FW: ${payload.firmwareVersion})`);

      // Immediately sync current active profile to the device
      await syncActiveProfileToDevice(client.ws);
      break;
    }

    case 'button.press': {
      const payload = msg.payload as ButtonEventPayload;
      console.log(`[WebSocket] Button pressed at row ${payload.rowIdx}, col ${payload.colIdx} (ID: ${payload.buttonId})`);
      
      // Look up actions for this button
      const actions = await db.all(
        'SELECT action_type, payload, sequence_order, delay_ms FROM actions WHERE button_id = ? ORDER BY sequence_order ASC',
        [payload.buttonId]
      );

      // Execute each action in sequence
      for (const action of actions) {
        if (action.delay_ms > 0) {
          await new Promise(resolve => setTimeout(resolve, action.delay_ms));
        }

        const payloadObj = JSON.parse(action.payload);
        const result = await executeAction(action.action_type, payloadObj);

        // Report execution result
        broadcastToWeb({
          protocolVersion: PROTOCOL_VERSION,
          id: `msg_exec_${Date.now()}`,
          type: 'action.execute',
          timestamp: new Date().toISOString(),
          source: 'bridge',
          target: 'web',
          payload: {
            buttonId: payload.buttonId,
            actionType: action.action_type,
            success: result.success,
            error: result.error
          }
        });
      }
      break;
    }

    case 'button.release': {
      // For MVP we log button release but take no immediate sequence action
      console.log(`[WebSocket] Button released: ${msg.payload.buttonId}`);
      break;
    }

    default:
      console.log(`[WebSocket] Unhandled message type: ${msg.type}`);
  }
}

export async function broadcastProfileChange(profileId: string) {
  // Sync to device(s)
  for (const client of clients) {
    if (client.type === 'device') {
      await syncActiveProfileToDevice(client.ws);
    }
  }

  // Notify web UI(s)
  broadcastToWeb({
    protocolVersion: PROTOCOL_VERSION,
    id: `msg_prof_${Date.now()}`,
    type: 'device.status',
    timestamp: new Date().toISOString(),
    source: 'bridge',
    target: 'web',
    payload: {
      connected: Array.from(clients).some(c => c.type === 'device'),
      activeProfileId: profileId,
    }
  });
}

export function broadcastToWeb(msg: MessageEnvelope) {
  const payloadStr = JSON.stringify(msg);
  for (const client of clients) {
    if (client.type === 'web') {
      client.ws.send(payloadStr);
    }
  }
}

async function syncActiveProfileToDevice(ws: WebSocket) {
  const db = await getDb();
  const activeProfileId = getCurrentProfileId();

  // Load profile details
  const profile = await db.get('SELECT * FROM profiles WHERE id = ?', [activeProfileId]);
  if (!profile) return;

  const pages = await db.all('SELECT * FROM pages WHERE profile_id = ? ORDER BY page_index ASC', [activeProfileId]);
  
  const fullPages = [];
  for (const page of pages) {
    const buttons = await db.all('SELECT * FROM buttons WHERE page_id = ? ORDER BY row_idx, col_idx ASC', [page.id]);
    fullPages.push({
      id: page.id,
      name: page.name,
      pageIndex: page.page_index,
      buttons: buttons.map(b => ({
        id: b.id,
        rowIdx: b.row_idx,
        colIdx: b.col_idx,
        label: b.label || '',
        iconAssetId: b.icon_asset_id || ''
      }))
    });
  }

  const syncMsg: MessageEnvelope = {
    protocolVersion: PROTOCOL_VERSION,
    id: `msg_sync_${Date.now()}`,
    type: 'profile.sync',
    timestamp: new Date().toISOString(),
    source: 'bridge',
    target: 'device',
    payload: {
      activeProfile: {
        id: profile.id,
        name: profile.name,
        isFallback: !!profile.is_fallback,
        pages: fullPages
      }
    }
  };

  ws.send(JSON.stringify(syncMsg));
}

// Generate system widget updates
async function broadcastWidgetUpdates() {
  const hasDevice = Array.from(clients).some(c => c.type === 'device');
  if (clients.size === 0) return;

  // CPU/RAM Simulation (for MVP system widgets)
  const mockCpu = Math.floor(Math.random() * 30) + 5; // 5% - 35%
  const mockRam = Math.floor(Math.random() * 20) + 40; // 40% - 60%

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');

  const widgetsData = [
    { id: 'w_cpu', type: 'system.cpu', data: { value: `${mockCpu}%` } },
    { id: 'w_ram', type: 'system.ram', data: { value: `${mockRam}%` } },
    { id: 'w_time', type: 'system.time', data: { value: `${hours}:${minutes}` } }
  ];

  for (const widget of widgetsData) {
    const msg: MessageEnvelope = {
      protocolVersion: PROTOCOL_VERSION,
      id: `msg_widget_${widget.id}_${Date.now()}`,
      type: 'widget.update',
      timestamp: now.toISOString(),
      source: 'bridge',
      target: 'broadcast',
      payload: widget
    };
    
    const serialized = JSON.stringify(msg);
    for (const client of clients) {
      client.ws.send(serialized);
    }
  }
}
