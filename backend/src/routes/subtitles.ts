// src/routes/subtitles.ts
import type { FastifyInstance } from 'fastify';
import { searchSubtitles } from '../services/subtitles.js';

export async function subtitleRoutes(app: FastifyInstance) {
  app.get('/subtitles', async (req) => {
    const { tmdb_id, season, episode, language } = req.query as {
      tmdb_id: string; season?: string; episode?: string; language?: string;
    };
    if (!tmdb_id) return { error: 'tmdb_id required', code: 400 };
    const subs = await searchSubtitles(
      tmdb_id,
      season ? Number(season) : undefined,
      episode ? Number(episode) : undefined,
      language || 'en'
    );
    return { subtitles: subs };
  });
}
