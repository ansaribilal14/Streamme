// src/db/database.ts
import Database from 'better-sqlite3';
import { logger } from '../services/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database.Database | null = null;

export function getDbPath(): string {
  const fromEnv = process.env.DB_PATH;
  if (fromEnv) return fromEnv;
  // Default to project database directory
  return join(__dirname, '..', '..', '..', 'database', 'streamhub.db');
}

export function initDatabase(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  logger.info({ dbPath }, 'Initializing SQLite database');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('movie','show')),
      poster_url TEXT,
      season INTEGER,
      episode INTEGER,
      episode_title TEXT,
      position_seconds REAL NOT NULL DEFAULT 0,
      duration_seconds REAL,
      watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tmdb_id, season, episode)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('movie','show')),
      poster_url TEXT,
      year INTEGER,
      rating REAL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      version TEXT NOT NULL,
      filename TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      repo_url TEXT,
      installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_updated DATETIME,
      language TEXT,
      categories TEXT
    );

    CREATE TABLE IF NOT EXISTS subtitle_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id TEXT NOT NULL,
      season INTEGER,
      episode INTEGER,
      language TEXT NOT NULL DEFAULT 'en',
      source TEXT NOT NULL,
      url TEXT NOT NULL,
      label TEXT,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tmdb_id, season, episode, language, source)
    );

    CREATE TABLE IF NOT EXISTS metadata_cache (
      tmdb_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_history_watched_at ON history(watched_at DESC);
    CREATE INDEX IF NOT EXISTS idx_favorites_added_at ON favorites(added_at DESC);
    CREATE INDEX IF NOT EXISTS idx_metadata_fetched ON metadata_cache(fetched_at);
  `);

  // Seed default settings if missing
  const insertDefault = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  insertDefault.run('default_subtitle_language', 'en');
  insertDefault.run('theme', 'dark');
  insertDefault.run('default_quality', '1080p');
  insertDefault.run('downloads_enabled', 'false');

  // Seed default providers
  const seedProvider = db.prepare(`
    INSERT OR IGNORE INTO providers (name, version, filename, enabled, repo_url, language, categories)
    VALUES (?, ?, ?, 1, ?, ?, ?)
  `);
  const defaultProviders = [
    ['VegaMovies', '1.4', 'vegamovies.cs3', 'https://github.com/cloudstream-re/cloudstream.git', 'hi', 'movies,shows'],
    ['HDHub4u', '2.1', 'hdhub4u.cs3', 'https://github.com/cloudstream-re/cloudstream.git', 'hi', 'movies'],
    ['MoviesDrive', '1.8', 'moviesdrive.cs3', 'https://github.com/cloudstream-re/cloudstream.git', 'hi', 'movies,shows'],
    ['Bollyflix', '1.6', 'bollyflix.cs3', 'https://github.com/cloudstream-re/cloudstream.git', 'hi', 'movies'],
    ['CastleTV', '1.2', 'castletv.cs3', 'https://github.com/cloudstream-re/cloudstream.git', 'en', 'shows'],
  ];
  for (const p of defaultProviders) seedProvider.run(...p);

  logger.info('Database initialized with schema + seed data');
  return db;
}

export function getDb(): Database.Database {
  if (!db) return initDatabase();
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
