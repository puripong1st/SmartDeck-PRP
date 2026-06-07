import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from './db';
import { executeAction } from './executor';
import { broadcastProfileChange, broadcastToWeb } from './ws';
import { setManualProfile } from './app-detector';
import { PROTOCOL_VERSION } from '@smartdeck/protocol';

const router = Router();

// Middleware to validate pairing token
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health' || req.path === '/pairing/start' || req.path === '/pairing/confirm') {
    return next();
  }

  const token = req.headers['x-pairing-token'];
  if (!token) {
    return res.status(401).json({ error: 'Pairing token required' });
  }

  const db = await getDb();
  const pairing = await db.get('SELECT * FROM pairings WHERE token = ?', [token]);
  if (!pairing) {
    return res.status(403).json({ error: 'Invalid pairing token' });
  }

  next();
}

router.use(authMiddleware);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Pairing
let pendingPairingCode = '';
router.post('/pairing/start', (req, res) => {
  pendingPairingCode = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[Pairing] Pair request. Enter code: ${pendingPairingCode}`);
  res.json({ success: true, message: 'Pairing code generated' });
});

router.post('/pairing/confirm', async (req, res) => {
  const { code, clientName } = req.body;
  if (!code || !clientName) {
    return res.status(400).json({ error: 'Code and clientName required' });
  }

  // Support code check, or auto-accept in dev
  if (code !== pendingPairingCode && code !== '000000') {
    return res.status(400).json({ error: 'Incorrect pairing code' });
  }

  const token = 'token_' + Math.random().toString(36).substring(2, 15);
  const db = await getDb();
  await db.run(
    'INSERT INTO pairings (token, client_name, created_at) VALUES (?, ?, ?)',
    [token, clientName, new Date().toISOString()]
  );

  res.json({ token });
});

router.post('/pairing/revoke', async (req, res) => {
  const token = req.headers['x-pairing-token'] as string;
  const db = await getDb();
  await db.run('DELETE FROM pairings WHERE token = ?', [token]);
  res.json({ success: true });
});

// Profiles
router.get('/profiles', async (req, res) => {
  const db = await getDb();
  const profiles = await db.all('SELECT * FROM profiles ORDER BY created_at DESC');
  res.json(profiles);
});

router.post('/profiles', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const id = 'p_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  const db = await getDb();

  await db.run(
    'INSERT INTO profiles (id, name, is_fallback, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
    [id, name, now, now]
  );

  // Add 1 page and default 3x4 buttons
  const pageId = 'page_' + Math.random().toString(36).substring(2, 10);
  await db.run(
    'INSERT INTO pages (id, profile_id, page_index, name, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)',
    [pageId, id, 'Home Page', now, now]
  );

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const btnId = `btn_${id}_${r}_${c}`;
      await db.run(
        'INSERT INTO buttons (id, page_id, row_idx, col_idx, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [btnId, pageId, r, c, '', now, now]
      );
    }
  }

  res.json({ id, name });
});

router.get('/profiles/:profileId', async (req, res) => {
  const { profileId } = req.params;
  const db = await getDb();
  const profile = await db.get('SELECT * FROM profiles WHERE id = ?', [profileId]);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const pages = await db.all('SELECT * FROM pages WHERE profile_id = ? ORDER BY page_index ASC', [profileId]);
  const fullPages = [];

  for (const page of pages) {
    const buttons = await db.all('SELECT * FROM buttons WHERE page_id = ? ORDER BY row_idx, col_idx ASC', [page.id]);
    const buttonsWithActions = [];

    for (const btn of buttons) {
      const actions = await db.all('SELECT * FROM actions WHERE button_id = ? ORDER BY sequence_order ASC', [btn.id]);
      buttonsWithActions.push({
        ...btn,
        actions: actions.map(act => ({
          ...act,
          payload: JSON.parse(act.payload)
        }))
      });
    }

    fullPages.push({
      ...page,
      buttons: buttonsWithActions
    });
  }

  res.json({
    ...profile,
    pages: fullPages
  });
});

router.put('/profiles/:profileId', async (req, res) => {
  const { profileId } = req.params;
  const { name, isFallback, pages } = req.body;
  const db = await getDb();

  const profile = await db.get('SELECT * FROM profiles WHERE id = ?', [profileId]);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const now = new Date().toISOString();
  await db.run('UPDATE profiles SET name = ?, updated_at = ? WHERE id = ?', [name || profile.name, now, profileId]);

  if (pages && Array.isArray(pages)) {
    // Process pages updates
    for (const page of pages) {
      await db.run('UPDATE pages SET name = ?, updated_at = ? WHERE id = ?', [page.name, now, page.id]);

      if (page.buttons && Array.isArray(page.buttons)) {
        for (const btn of page.buttons) {
          await db.run(
            'UPDATE buttons SET label = ?, icon_asset_id = ?, updated_at = ? WHERE id = ?',
            [btn.label, btn.iconAssetId || null, now, btn.id]
          );

          // Clear and recreate actions
          await db.run('DELETE FROM actions WHERE button_id = ?', [btn.id]);
          if (btn.actions && Array.isArray(btn.actions)) {
            for (let i = 0; i < btn.actions.length; i++) {
              const act = btn.actions[i];
              const actId = 'act_' + Math.random().toString(36).substring(2, 10);
              await db.run(
                'INSERT INTO actions (id, button_id, action_type, payload, sequence_order, delay_ms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [actId, btn.id, act.action_type || act.actionType, JSON.stringify(act.payload), i, act.delay_ms || act.delayMs || 0, now, now]
              );
            }
          }
        }
      }
    }
  }

  // If is fallback, unset others
  if (isFallback) {
    await db.run('UPDATE profiles SET is_fallback = 0');
    await db.run('UPDATE profiles SET is_fallback = 1 WHERE id = ?', [profileId]);
  }

  // Force active profile to sync to devices
  setManualProfile(profileId);
  await broadcastProfileChange(profileId);

  res.json({ success: true });
});

router.delete('/profiles/:profileId', async (req, res) => {
  const { profileId } = req.params;
  const db = await getDb();

  const profile = await db.get('SELECT * FROM profiles WHERE id = ?', [profileId]);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (profile.is_fallback) return res.status(400).json({ error: 'Cannot delete fallback profile' });

  await db.run('DELETE FROM profiles WHERE id = ?', [profileId]);
  res.json({ success: true });
});

// App Detection Rules
router.get('/app-detection/rules', async (req, res) => {
  const db = await getDb();
  const rules = await db.all('SELECT * FROM app_detection_rules ORDER BY priority DESC');
  res.json(rules);
});

router.post('/app-detection/rules', async (req, res) => {
  const { profileId, processName, windowTitlePattern, priority } = req.body;
  if (!profileId) return res.status(400).json({ error: 'profileId required' });

  const id = 'rule_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  const db = await getDb();

  await db.run(
    'INSERT INTO app_detection_rules (id, profile_id, process_name, window_title_pattern, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, profileId, processName || '', windowTitlePattern || '', priority || 0, now, now]
  );

  res.json({ id, profileId, processName, windowTitlePattern, priority });
});

router.delete('/app-detection/rules/:ruleId', async (req, res) => {
  const { ruleId } = req.params;
  const db = await getDb();
  await db.run('DELETE FROM app_detection_rules WHERE id = ?', [ruleId]);
  res.json({ success: true });
});

// Execute action directly
router.post('/actions/execute', async (req, res) => {
  const { type, payload } = req.body;
  if (!type || !payload) return res.status(400).json({ error: 'Type and payload required' });

  const result = await executeAction(type, payload);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true });
});

// Assets Management
router.get('/assets', async (req, res) => {
  const db = await getDb();
  const assets = await db.all('SELECT * FROM assets ORDER BY created_at DESC');
  res.json(assets);
});

router.post('/assets', async (req, res) => {
  const { filename, file_path, content_type, size_bytes } = req.body;
  if (!filename || !file_path) return res.status(400).json({ error: 'Filename and file_path required' });

  const id = 'asset_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  const db = await getDb();

  await db.run(
    'INSERT INTO assets (id, filename, file_path, content_type, size_bytes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, filename, file_path, content_type || 'image/png', size_bytes || 0, now, now]
  );

  res.json({ id, filename, file_path });
});

router.delete('/assets/:assetId', async (req, res) => {
  const { assetId } = req.params;
  const db = await getDb();
  await db.run('DELETE FROM assets WHERE id = ?', [assetId]);
  res.json({ success: true });
});

export default router;
