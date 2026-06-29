// src/routes/search.ts
import type { FastifyInstance } from 'fastify';
import { searchAcrossProviders } from '../services/cs3Bridge.js';
import { searchTmdb, getTmdbDetails, posterUrl } from '../services/tmdb.js';
import { listEnabledProviders } from '../db/providers.js';
import { logger } from '../services/logger.js';

export async function searchRoutes(app: FastifyInstance) {
  app.get('/search', async (req, reply) => {
    const q = (req.query as { q?: string }).q?.trim();
    const typeFilter = (req.query as { type?: string }).type;
    const providerFilter = (req.query as { providers?: string }).providers;

    if (!q || q.length < 2) {
      return reply.code(400).send({ error: 'Query too short', code: 400 });
    }

    const enabled = listEnabledProviders();
    const enabledNames = enabled.map((p) => p.name);
    const targetProviders = providerFilter
      ? providerFilter.split(',').filter((p) => enabledNames.includes(p))
      : enabledNames;

    // 1. Fan out to CS3 bridge
    const bridgeResults = await searchAcrossProviders(q, targetProviders);

    // 2. Deduplicate by title+year, then enrich with TMDB metadata
    const seen = new Set<string>();
    const enriched: any[] = [];

    // 2a. If bridge returned results, enrich each with TMDB poster/rating
    for (const r of bridgeResults) {
      const key = `${r.title}|${r.year || ''}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      // Try to find TMDB match by title+year
      const tmdbMatches = await searchTmdb(r.title, 'multi');
      const match = tmdbMatches.find((m) => {
        const title = (m.title || m.name || '').toLowerCase();
        const year = m.release_date ? new Date(m.release_date).getFullYear() : m.first_air_date ? new Date(m.first_air_date).getFullYear() : undefined;
        return title.includes(r.title.toLowerCase().slice(0, 10)) && (!r.year || !year || Math.abs(year - r.year) <= 1);
      }) || tmdbMatches[0];

      const mediaType = match?.release_date ? 'movie' : match?.first_air_date ? 'show' : r.type;
      if (typeFilter && typeFilter !== 'both' && typeFilter !== mediaType) continue;

      enriched.push({
        id: r.id,
        provider: r.provider,
        tmdb_id: match ? String(match.id) : '',
        title: r.title,
        type: mediaType,
        year: match ? new Date(match.release_date || match.first_air_date || '').getFullYear() : r.year,
        poster_url: posterUrl(match?.poster_path) || r.poster_url,
        rating: match?.vote_average || r.rating,
        overview: match?.overview || r.overview,
      });
    }

    // 2b. If bridge had no results (no providers installed), fall back to TMDB search only
    if (enriched.length === 0) {
      const tmdbResults = await searchTmdb(q, typeFilter === 'show' ? 'tv' : typeFilter === 'movie' ? 'movie' : 'multi');
      for (const m of tmdbResults.slice(0, 30)) {
        const mediaType = m.release_date ? 'movie' : 'show';
        if (typeFilter && typeFilter !== 'both' && typeFilter !== mediaType) continue;
        enriched.push({
          id: `tmdb::${m.id}`,
          provider: 'tmdb',
          tmdb_id: String(m.id),
          title: m.title || m.name || 'Untitled',
          type: mediaType,
          year: m.release_date ? new Date(m.release_date).getFullYear() : m.first_air_date ? new Date(m.first_air_date).getFullYear() : undefined,
          poster_url: posterUrl(m.poster_path),
          rating: m.vote_average,
          overview: m.overview,
        });
      }
    }

    logger.info({ q, count: enriched.length }, 'Search complete');
    return {
      results: enriched,
      providers_searched: targetProviders,
      total: enriched.length,
    };
  });
}
