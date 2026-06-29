// src/routes/admin.ts
import type { FastifyInstance } from 'fastify';
import { adminGuard, setPinHash, hashPin, hasPinSet, verifyPin } from '../middleware/auth.js';
import {
  listProviders, enableProvider, disableProvider, installProvider, removeProvider, touchProviders,
} from '../db/providers.js';
import { reloadBridge, bridgeHealth } from '../services/cs3Bridge.js';
import { getLogBuffer, clearLogBuffer } from '../services/logger.js';
import { getDb } from '../db/database.js';

export async function adminRoutes(app: FastifyInstance) {
  // Setup endpoint - lets user set their first PIN (no auth required the first time)
  app.post('/admin/setup', async (req, reply) => {
    if (hasPinSet()) {
      return reply.code(400).send({ error: 'PIN already set. Use /admin/change-pin.', code: 400 });
    }
    const { pin } = req.body as { pin?: string };
    if (!pin || pin.length < 4 || pin.length > 8) {
      return reply.code(400).send({ error: 'PIN must be 4-8 characters', code: 400 });
    }
    setPinHash(await hashPin(pin));
    return { ok: true, message: 'PIN set successfully' };
  });

  app.post('/admin/change-pin', { preHandler: adminGuard }, async (req, reply) => {
    const { new_pin } = req.body as { new_pin?: string };
    if (!new_pin || new_pin.length < 4 || new_pin.length > 8) {
      return reply.code(400).send({ error: 'PIN must be 4-8 characters', code: 400 });
    }
    setPinHash(await hashPin(new_pin));
    return { ok: true };
  });

  app.post('/admin/verify-pin', async (req) => {
    const { pin } = req.body as { pin?: string };
    if (!pin) return { ok: false };
    return { ok: await verifyPin(pin) };
  });

  app.get('/admin/has-pin', async () => {
    return { has_pin: hasPinSet() };
  });

  // PIN-protected routes
  app.get('/admin/providers', { preHandler: adminGuard }, async () => {
    return { providers: listProviders() };
  });

  app.post('/admin/providers/enable/:name', { preHandler: adminGuard }, async (req, reply) => {
    const { name } = req.params as { name: string };
    const ok = enableProvider(name);
    if (!ok) return reply.code(404).send({ error: 'Provider not found', code: 404 });
    return { ok: true };
  });

  app.post('/admin/providers/disable/:name', { preHandler: adminGuard }, async (req, reply) => {
    const { name } = req.params as { name: string };
    const ok = disableProvider(name);
    if (!ok) return reply.code(404).send({ error: 'Provider not found', code: 404 });
    return { ok: true };
  });

  app.post('/admin/providers/install', { preHandler: adminGuard }, async (req, reply) => {
    const body = req.body as {
      name: string; version: string; filename: string;
      repo_url?: string; language?: string; categories?: string[];
    };
    if (!body?.name || !body?.filename) {
      return reply.code(400).send({ error: 'name and filename required', code: 400 });
    }
    installProvider({
      name: body.name,
      version: body.version || '1.0',
      filename: body.filename,
      repo_url: body.repo_url,
      language: body.language,
      categories: body.categories,
    });
    return { ok: true };
  });

  app.delete('/admin/providers/:name', { preHandler: adminGuard }, async (req, reply) => {
    const { name } = req.params as { name: string };
    removeProvider(name);
    return { ok: true };
  });

  app.post('/admin/providers/update', { preHandler: adminGuard }, async () => {
    touchProviders();
    const reloaded = await reloadBridge();
    return { ok: reloaded };
  });

  app.get('/admin/logs', { preHandler: adminGuard }, async (req) => {
    const filter = (req.query as { filter?: 'error' | 'warn' | 'info' }).filter;
    return { logs: getLogBuffer(filter) };
  });

  app.delete('/admin/logs', { preHandler: adminGuard }, async () => {
    clearLogBuffer();
    return { ok: true };
  });

  app.post('/admin/cache/clear', { preHandler: adminGuard }, async () => {
    getDb().prepare(`DELETE FROM metadata_cache`).run();
    getDb().prepare(`DELETE FROM subtitle_cache`).run();
    return { ok: true };
  });

  app.get('/admin/cache/stats', { preHandler: adminGuard }, async () => {
    const meta = (getDb().prepare(`SELECT COUNT(*) as c FROM metadata_cache`).get() as { c: number }).c;
    const subs = (getDb().prepare(`SELECT COUNT(*) as c FROM subtitle_cache`).get() as { c: number }).c;
    const dbSize = getDb().prepare(`SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()`).get() as { size: number };
    return {
      metadata_count: meta,
      subtitle_count: subs,
      db_size_bytes: dbSize.size,
    };
  });

  app.get('/admin/health', async () => {
    return {
      backend: 'ok',
      cs3_bridge: (await bridgeHealth()) ? 'ok' : 'down',
      database: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/admin/settings', { preHandler: adminGuard }, async () => {
    const rows = getDb().prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[];
    const settings: Record<string, any> = {};
    for (const r of rows) settings[r.key] = r.value;
    // Mask API keys
    if (settings.tmdb_api_key) settings.tmdb_api_key = '***';
    if (settings.omdb_api_key) settings.omdb_api_key = '***';
    if (settings.opensubtitles_api_key) settings.opensubtitles_api_key = '***';
    if (settings.admin_pin_hash) delete settings.admin_pin_hash;
    return { settings };
  });

  app.post('/admin/settings', { preHandler: adminGuard }, async (req) => {
    const body = req.body as Record<string, string>;
    const allowed = ['tmdb_api_key', 'omdb_api_key', 'opensubtitles_api_key', 'subdl_api_key',
                     'default_subtitle_language', 'theme', 'default_quality', 'downloads_enabled'];
    const stmt = getDb().prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    for (const k of allowed) {
      if (body[k] !== undefined) stmt.run(k, body[k]);
    }
    return { ok: true };
  });
}
