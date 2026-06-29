// src/db/providers.ts
import { getDb } from './database.js';
import type { ProviderInfo } from '../types/index.js';

interface ProviderRow {
  id: number;
  name: string;
  version: string;
  filename: string;
  enabled: number;
  repo_url: string | null;
  installed_at: string;
  last_updated: string | null;
  language: string | null;
  categories: string | null;
}

function rowToInfo(row: ProviderRow): ProviderInfo {
  return {
    name: row.name,
    version: row.version,
    filename: row.filename,
    enabled: !!row.enabled,
    repo_url: row.repo_url || undefined,
    installed_at: row.installed_at,
    last_updated: row.last_updated || undefined,
    language: row.language || undefined,
    categories: row.categories ? row.categories.split(',') : undefined,
    status: row.enabled ? 'active' : 'disabled',
  };
}

export function listProviders(includeDisabled = true): ProviderInfo[] {
  const db = getDb();
  const rows = includeDisabled
    ? db.prepare(`SELECT * FROM providers ORDER BY name`).all() as ProviderRow[]
    : db.prepare(`SELECT * FROM providers WHERE enabled = 1 ORDER BY name`).all() as ProviderRow[];
  return rows.map(rowToInfo);
}

export function listEnabledProviders(): ProviderInfo[] {
  return listProviders(false);
}

export function enableProvider(name: string): boolean {
  const db = getDb();
  const r = db.prepare(`UPDATE providers SET enabled = 1 WHERE name = ?`).run(name);
  return r.changes > 0;
}

export function disableProvider(name: string): boolean {
  const db = getDb();
  const r = db.prepare(`UPDATE providers SET enabled = 0 WHERE name = ?`).run(name);
  return r.changes > 0;
}

export function installProvider(input: {
  name: string;
  version: string;
  filename: string;
  repo_url?: string;
  language?: string;
  categories?: string[];
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO providers (name, version, filename, enabled, repo_url, language, categories, installed_at, last_updated)
    VALUES (?, ?, ?, 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(name) DO UPDATE SET
      version = excluded.version,
      filename = excluded.filename,
      repo_url = COALESCE(excluded.repo_url, providers.repo_url),
      last_updated = CURRENT_TIMESTAMP
  `).run(
    input.name,
    input.version,
    input.filename,
    input.repo_url || null,
    input.language || null,
    input.categories ? input.categories.join(',') : null
  );
}

export function removeProvider(name: string): boolean {
  const db = getDb();
  const r = db.prepare(`DELETE FROM providers WHERE name = ?`).run(name);
  return r.changes > 0;
}

export function touchProviders(): void {
  const db = getDb();
  db.prepare(`UPDATE providers SET last_updated = CURRENT_TIMESTAMP`).run();
}
