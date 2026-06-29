// cs3-bridge/src/routes/bridge.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function registerRoutes(app, providers, logger) {

  app.get('/providers', async () => {
    return {
      providers: providers.map(p => ({
        ...p.info(),
        status: p.enabled ? 'active' : 'disabled',
        filename: `${p.name.toLowerCase().replace(/\s/g, '')}.cs3`,
        installed_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })),
    };
  });

  app.get('/search', async (req, reply) => {
    const q = (req.query.q || '').toString().trim();
    const providerFilter = (req.query.providers || '').toString();
    if (!q) return reply.code(400).send({ error: 'q required' });

    let target = providers;
    if (providerFilter && providerFilter !== 'all') {
      const names = providerFilter.split(',').map(s => s.trim().toLowerCase());
      target = providers.filter(p => names.includes(p.name.toLowerCase()));
    }

    const settled = await Promise.allSettled(target.map(p => p.search(q)));
    const results = [];
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        results.push(...r.value);
      } else {
        logger.warn({ provider: target[i].name, err: r.reason?.message }, 'Provider search failed');
      }
    });
    return { results, providers_searched: target.map(p => p.name), total: results.length };
  });

  app.get('/details/:provider/:id', async (req, reply) => {
    const { provider, id } = req.params;
    const p = providers.find(p => p.name.toLowerCase() === provider.toLowerCase());
    if (!p) return reply.code(404).send({ error: 'Provider not found' });
    const detail = await p.details(id);
    if (!detail) return reply.code(404).send({ error: 'Not found' });
    return detail;
  });

  app.get('/episodes/:provider/:id', async (req, reply) => {
    const { provider, id } = req.params;
    const season = Number(req.query.season);
    if (!season) return reply.code(400).send({ error: 'season required' });
    const p = providers.find(p => p.name.toLowerCase() === provider.toLowerCase());
    if (!p) return reply.code(404).send({ error: 'Provider not found' });
    const episodes = await p.episodes(id, season);
    return { season, episodes };
  });

  app.get('/seasons/:provider/:id', async (req, reply) => {
    const { provider, id } = req.params;
    const p = providers.find(p => p.name.toLowerCase() === provider.toLowerCase());
    if (!p) return reply.code(404).send({ error: 'Provider not found' });
    const detail = await p.details(id);
    return { seasons: detail?.seasons || [] };
  });

  app.get('/streams/:provider/:id', async (req, reply) => {
    const { provider, id } = req.params;
    const season = req.query.season ? Number(req.query.season) : undefined;
    const episode = req.query.episode ? Number(req.query.episode) : undefined;
    const p = providers.find(p => p.name.toLowerCase() === provider.toLowerCase());
    if (!p) return reply.code(404).send({ error: 'Provider not found' });
    const streams = await p.streams(id, season, episode);
    return { streams };
  });

  app.post('/reload', async () => {
    // Re-scan extensions dir for .cs3 markers. Full hot-reload of a JVM
    // extension would happen here in the future.
    const ext = path.resolve(__dirname, '..', '..', 'extensions');
    let count = 0;
    try {
      if (fs.existsSync(ext)) {
        count = fs.readdirSync(ext).filter(f => f.endsWith('.cs3')).length;
      }
    } catch {}
    logger.info({ count }, 'Reload requested');
    return { ok: true, providers: providers.length, extensions_detected: count };
  });
}
