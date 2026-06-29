// src/routes/details.ts
import type { FastifyInstance } from 'fastify';
import { getDetailsFromBridge } from '../services/cs3Bridge.js';
import { getTmdbDetails, posterUrl, backdropUrl } from '../services/tmdb.js';
import { getHistoryByTmdb } from '../db/history.js';
import { isFavorite } from '../db/favorites.js';

export async function detailsRoutes(app: FastifyInstance) {
  app.get('/details/:provider/:id', async (req, reply) => {
    const { provider, id } = req.params as { provider: string; id: string };

    // If the ID already encodes a tmdb_id (format: tmdb::12345 or just a number), use it directly
    let tmdbId = '';
    let mediaType: 'movie' | 'tv' = 'movie';
    if (id.startsWith('tmdb::')) {
      tmdbId = id.slice(6);
    } else if (/^\d+$/.test(id)) {
      tmdbId = id;
    }

    // Try to determine type from query
    const queryType = (req.query as { type?: string }).type;
    if (queryType === 'show') mediaType = 'tv';
    else if (queryType === 'movie') mediaType = 'movie';

    // First try the CS3 bridge (if a real provider exists)
    const bridgeData = await getDetailsFromBridge(provider, id);

    // If bridge has data, merge with TMDB
    let tmdbData = null;
    if (bridgeData?.tmdb_id) {
      tmdbId = bridgeData.tmdb_id;
      mediaType = bridgeData.type === 'show' ? 'tv' : 'movie';
    }
    if (tmdbId) {
      tmdbData = await getTmdbDetails(tmdbId, mediaType);
    }

    const history = tmdbId ? getHistoryByTmdb(tmdbId) : null;
    const favorite = tmdbId ? isFavorite(tmdbId) : false;

    // Compose final detail object
    const title = tmdbData?.title || tmdbData?.name || bridgeData?.title || 'Untitled';
    const year = tmdbData?.release_date
      ? new Date(tmdbData.release_date).getFullYear()
      : tmdbData?.first_air_date
        ? new Date(tmdbData.first_air_date).getFullYear()
        : bridgeData?.year;

    const result: any = {
      id: bridgeData?.id || `tmdb::${tmdbId}`,
      provider,
      tmdb_id: tmdbId,
      title,
      type: mediaType === 'tv' ? 'show' : 'movie',
      year,
      poster_url: posterUrl(tmdbData?.poster_path) || bridgeData?.poster_url,
      backdrop_url: backdropUrl(tmdbData?.backdrop_path) || bridgeData?.backdrop_url,
      rating: tmdbData?.vote_average || bridgeData?.rating,
      runtime_minutes: tmdbData?.runtime || (tmdbData?.episode_run_time?.[0]) || bridgeData?.runtime_minutes,
      genres: tmdbData?.genres?.map((g) => g.name) || bridgeData?.genres || [],
      overview: tmdbData?.overview || bridgeData?.overview || '',
      tagline: tmdbData?.tagline,
      cast: tmdbData?.cast?.map((c) => ({ name: c.name, character: c.character, avatar: posterUrl(c.profile_path, 'w200') })) || [],
      director: tmdbData?.director || bridgeData?.director,
      trailer_url: tmdbData?.trailer_url || bridgeData?.trailer_url,
      favorite,
      history: history ? {
        position_seconds: history.position_seconds,
        duration_seconds: history.duration_seconds,
        season: history.season,
        episode: history.episode,
      } : null,
    };

    if (mediaType === 'tv') {
      result.seasons = (tmdbData?.seasons || []).map((s) => ({
        number: s.season_number,
        episode_count: s.episode_count,
        air_date: s.air_date,
        name: s.name,
        overview: s.overview,
      })).filter((s) => s.number > 0); // skip "Specials"
    }

    return result;
  });
}
