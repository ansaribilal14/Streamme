// src/routes/favorites.ts
import type { FastifyInstance } from 'fastify';
import { addFavorite, removeFavorite, getFavorites, AddFavoriteInput } from '../db/favorites.js';

export async function favoritesRoutes(app: FastifyInstance) {
  app.get('/favorites', async (req) => {
    const sortBy = (req.query as { sort?: 'recent' | 'az' | 'rating' }).sort || 'recent';
    return { favorites: getFavorites(sortBy) };
  });

  app.post('/favorites', async (req, reply) => {
    const body = req.body as Partial<AddFavoriteInput>;
    if (!body?.tmdb_id || !body?.title || !body?.provider || !body?.provider_id) {
      return reply.code(400).send({ error: 'Missing required fields', code: 400 });
    }
    addFavorite({
      tmdb_id: body.tmdb_id,
      provider: body.provider,
      provider_id: body.provider_id,
      title: body.title,
      type: body.type === 'show' ? 'show' : 'movie',
      poster_url: body.poster_url,
      year: body.year,
      rating: body.rating,
    });
    return { ok: true };
  });

  app.delete('/favorites/:tmdb_id', async (req) => {
    const { tmdb_id } = req.params as { tmdb_id: string };
    removeFavorite(tmdb_id);
    return { ok: true };
  });
}
