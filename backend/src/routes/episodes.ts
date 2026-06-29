// src/routes/episodes.ts
import type { FastifyInstance } from 'fastify';
import { getEpisodesFromBridge } from '../services/cs3Bridge.js';
import { getTmdbDetails, backdropUrl } from '../services/tmdb.js';

export async function episodesRoutes(app: FastifyInstance) {
  app.get('/episodes/:provider/:id', async (req, reply) => {
    const { provider, id } = req.params as { provider: string; id: string };
    const season = Number((req.query as { season?: string }).season);

    if (!season || season < 1) {
      return reply.code(400).send({ error: 'season query param required', code: 400 });
    }

    // 1. Try bridge first
    let episodes = await getEpisodesFromBridge(provider, id, season);

    // 2. Fallback: pull from TMDB if we have a tmdb_id
    if (episodes.length === 0) {
      let tmdbId = id;
      let mediaType: 'movie' | 'tv' = 'tv';
      if (id.startsWith('tmdb::')) tmdbId = id.slice(6);
      else if (/^\d+$/.test(id)) tmdbId = id;

      if (tmdbId) {
        const details = await getTmdbDetails(tmdbId, 'tv');
        if (details?.seasons) {
          // Get full season details
          const apiKey = (await import('../services/tmdb.js')).getApiKey();
          if (apiKey) {
            try {
              const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=${apiKey}`;
              const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
              if (res.ok) {
                const data = await res.json();
                episodes = (data.episodes || []).map((e: any) => ({
                  number: e.episode_number,
                  title: e.name || `Episode ${e.episode_number}`,
                  overview: e.overview,
                  air_date: e.air_date,
                  thumbnail_url: backdropUrl(e.still_path, 'w780'),
                  runtime_minutes: e.runtime,
                }));
              }
            } catch {}
          }
        }
      }
    }

    return { season, episodes };
  });
}
