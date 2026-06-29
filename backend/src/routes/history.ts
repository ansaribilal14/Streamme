// src/routes/history.ts
import type { FastifyInstance } from 'fastify';
import {
  upsertHistory, getHistory, deleteHistory, clearHistory, UpsertHistoryInput,
} from '../db/history.js';

export async function historyRoutes(app: FastifyInstance) {
  app.get('/history', async () => {
    return { history: getHistory() };
  });

  app.post('/history', async (req, reply) => {
    const body = req.body as Partial<UpsertHistoryInput>;
    if (!body?.tmdb_id || !body?.title || !body?.provider || !body?.provider_id) {
      return reply.code(400).send({ error: 'Missing required fields', code: 400 });
    }
    upsertHistory({
      tmdb_id: body.tmdb_id,
      provider: body.provider,
      provider_id: body.provider_id,
      title: body.title,
      type: body.type === 'show' ? 'show' : 'movie',
      poster_url: body.poster_url,
      season: body.season,
      episode: body.episode,
      episode_title: body.episode_title,
      position_seconds: body.position_seconds ?? 0,
      duration_seconds: body.duration_seconds,
    });
    return { ok: true };
  });

  app.delete('/history/:tmdb_id', async (req) => {
    const { tmdb_id } = req.params as { tmdb_id: string };
    deleteHistory(tmdb_id);
    return { ok: true };
  });

  app.delete('/history', async () => {
    clearHistory();
    return { ok: true };
  });
}
