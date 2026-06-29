// src/db/history.ts
import { getDb } from './database.js';
import type { HistoryEntry } from '../types/index.js';

export interface UpsertHistoryInput {
  tmdb_id: string;
  provider: string;
  provider_id: string;
  title: string;
  type: 'movie' | 'show';
  poster_url?: string;
  season?: number;
  episode?: number;
  episode_title?: string;
  position_seconds: number;
  duration_seconds?: number;
}

export function upsertHistory(input: UpsertHistoryInput): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO history (tmdb_id, provider, provider_id, title, type, poster_url, season, episode, episode_title, position_seconds, duration_seconds, watched_at)
    VALUES (@tmdb_id, @provider, @provider_id, @title, @type, @poster_url, @season, @episode, @episode_title, @position_seconds, @duration_seconds, CURRENT_TIMESTAMP)
    ON CONFLICT(tmdb_id, season, episode) DO UPDATE SET
      provider = excluded.provider,
      provider_id = excluded.provider_id,
      title = excluded.title,
      poster_url = COALESCE(excluded.poster_url, history.poster_url),
      position_seconds = excluded.position_seconds,
      duration_seconds = COALESCE(excluded.duration_seconds, history.duration_seconds),
      watched_at = CURRENT_TIMESTAMP
  `).run(input);
}

export function getHistory(limit = 100): HistoryEntry[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM history ORDER BY watched_at DESC LIMIT ?
  `).all(limit) as HistoryEntry[];
}

export function getHistoryByTmdb(tmdb_id: string, season?: number, episode?: number): HistoryEntry | null {
  const db = getDb();
  if (season !== undefined && episode !== undefined) {
    return db.prepare(`
      SELECT * FROM history WHERE tmdb_id = ? AND season = ? AND episode = ?
    `).get(tmdb_id, season, episode) as HistoryEntry | null;
  }
  return db.prepare(`SELECT * FROM history WHERE tmdb_id = ? ORDER BY watched_at DESC LIMIT 1`)
    .get(tmdb_id) as HistoryEntry | null;
}

export function deleteHistory(tmdb_id: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM history WHERE tmdb_id = ?`).run(tmdb_id);
}

export function clearHistory(): void {
  const db = getDb();
  db.prepare(`DELETE FROM history`).run();
}
