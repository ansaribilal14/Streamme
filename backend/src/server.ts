// src/server.ts
// StreamHub API Gateway entry point
import Fastify from 'fastify';
import { initDatabase, closeDatabase } from './db/database.js';
import { setupCors } from './middleware/cors.js';
import { logger, pushLogBuffer } from './services/logger.js';
import { searchRoutes } from './routes/search.js';
import { detailsRoutes } from './routes/details.js';
import { episodesRoutes } from './routes/episodes.js';
import { streamRoutes } from './routes/stream.js';
import { subtitleRoutes } from './routes/subtitles.js';
import { historyRoutes } from './routes/history.js';
import { favoritesRoutes } from './routes/favorites.js';
import { adminRoutes } from './routes/admin.js';
import { homeRoutes } from './routes/home.js';

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

const app = Fastify({
  logger: false,
  bodyLimit: 4 * 1024 * 1024,
});

app.addHook('onRequest', async (req) => {
  pushLogBuffer('info', `${req.method} ${req.url}`);
});

app.addHook('onError', async (req, reply, err) => {
  pushLogBuffer('error', `${req.method} ${req.url} -> ${err.message}`);
  logger.error({ err: err.message, url: req.url }, 'Request error');
});

async function start() {
  await setupCors(app);

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // Register all route groups under /api
  await app.register(async (api) => {
    await homeRoutes(api);
    await searchRoutes(api);
    await detailsRoutes(api);
    await episodesRoutes(api);
    await streamRoutes(api);
    await subtitleRoutes(api);
    await historyRoutes(api);
    await favoritesRoutes(api);
    await adminRoutes(api);
  }, { prefix: '/api' });

  try {
    initDatabase();
    await app.listen({ port: PORT, host: HOST });
    logger.info(`StreamHub API Gateway listening on http://${HOST}:${PORT}`);
    pushLogBuffer('info', `Server started on :${PORT}`);
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'Failed to start server');
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('SIGINT received - shutting down');
  closeDatabase();
  await app.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received - shutting down');
  closeDatabase();
  await app.close();
  process.exit(0);
});

start();
