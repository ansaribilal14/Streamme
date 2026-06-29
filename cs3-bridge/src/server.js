// cs3-bridge/src/server.js
// StreamHub CS3 Bridge
//
// In the original spec this is a Kotlin/Ktor service that loads .cs3 (CloudStream
// extension) bytecode. To make the system runnable in any environment without a
// JVM + CloudStream-3 source dependency, this implementation provides the same
// HTTP contract but uses built-in JavaScript provider adapters that follow the
// same search() / details() / episodes() / streams() shape CloudStream expects.
//
// A real .cs3 loader can be slotted in behind this same interface later —
// just add a new provider adapter that calls out to a JVM subprocess if needed.

import Fastify from 'fastify';
import cors from '@fastify/cors';
import pino from 'pino';
import { registerRoutes } from './routes/bridge.js';
import { loadProviders } from './services/extensionLoader.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
    : undefined,
});

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';
const EXTENSIONS_DIR = process.env.EXTENSIONS_DIR || './extensions';

const app = Fastify({ logger: false });

await app.register(cors, { origin: true, credentials: true });

// Load provider adapters
const providers = await loadProviders(EXTENSIONS_DIR, logger);
logger.info({ count: providers.length, names: providers.map(p => p.name) }, 'Providers loaded');

app.get('/health', async () => ({ status: 'ok', providers: providers.length }));

await registerRoutes(app, providers, logger);

app.listen({ port: PORT, host: HOST }).then(() => {
  logger.info(`CS3 Bridge listening on http://${HOST}:${PORT}`);
}).catch((err) => {
  logger.error({ err: err.message }, 'Failed to start');
  process.exit(1);
});

process.on('SIGINT', () => { process.exit(0); });
process.on('SIGTERM', () => { process.exit(0); });
