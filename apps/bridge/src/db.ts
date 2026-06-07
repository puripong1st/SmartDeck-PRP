import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: Database | null = null;

const DB_FILE = path.join(process.cwd(), 'smartdeck.db');

export async function initDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      is_fallback INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL,
      page_index INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS buttons (
      id TEXT PRIMARY KEY NOT NULL,
      page_id TEXT NOT NULL,
      row_idx INTEGER NOT NULL,
      col_idx INTEGER NOT NULL,
      label TEXT,
      icon_asset_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY (icon_asset_id) REFERENCES assets(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY NOT NULL,
      button_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      sequence_order INTEGER NOT NULL DEFAULT 0,
      delay_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (button_id) REFERENCES buttons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_detection_rules (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL,
      process_name TEXT,
      window_title_pattern TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pairings (
      token TEXT PRIMARY KEY NOT NULL,
      client_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT
    );
  `);

  // Insert default/fallback profile if none exists
  const fallbackCount = await db.get('SELECT COUNT(*) as count FROM profiles WHERE is_fallback = 1');
  if (fallbackCount?.count === 0) {
    const profileId = 'p_fallback';
    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO profiles (id, name, is_fallback, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
      [profileId, 'Default Profile', now, now]
    );

    // Create 3 default pages
    for (let i = 0; i < 3; i++) {
      const pageId = `page_fallback_${i}`;
      await db.run(
        'INSERT INTO pages (id, profile_id, page_index, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [pageId, profileId, i, `Page ${i + 1}`, now, now]
      );

      // Create empty buttons for a 3x4 grid
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          const btnId = `btn_fallback_${i}_${r}_${c}`;
          await db.run(
            'INSERT INTO buttons (id, page_id, row_idx, col_idx, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [btnId, pageId, r, c, '', now, now]
          );
        }
      }
    }
  }

  dbInstance = db;
  return db;
}

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}
