// src/routes/home.ts
// Home page data - aggregates trending, continue watching, favorites, recently added
import type { FastifyInstance } from 'fastify';
import { getTrending, posterUrl, backdropUrl } from '../services/tmdb.js';
import { getHistory } from '../db/history.js';
import { getFavorites } from '../db/favorites.js';

export async function homeRoutes(app: FastifyInstance) {
  app.get('/home', async () => {
    const [trendingMovies, trendingShows, history, favorites] = await Promise.all([
      getTrending('movie', 'week'),
      getTrending('tv', 'week'),
      Promise.resolve(getHistory(20)),
      Promise.resolve(getFavorites('recent')),
    ]);

    const heroPool = trendingMovies.slice(0, 5).map((m) => ({
      tmdb_id: String(m.id),
      title: m.title || 'Untitled',
      type: 'movie' as const,
      year: m.release_date ? new Date(m.release_date).getFullYear() : undefined,
      overview: m.overview,
      poster_url: posterUrl(m.poster_path),
      backdrop_url: backdropUrl(m.backdrop_path),
      rating: m.vote_average,
    }));

    const trendingList = trendingMovies.slice(0, 20).map((m) => ({
      tmdb_id: String(m.id),
      title: m.title || 'Untitled',
      type: 'movie' as const,
      year: m.release_date ? new Date(m.release_date).getFullYear() : undefined,
      poster_url: posterUrl(m.poster_path),
      rating: m.vote_average,
      overview: m.overview,
    }));

    const trendingShowsList = trendingShows.slice(0, 20).map((m) => ({
      tmdb_id: String(m.id),
      title: m.name || 'Untitled',
      type: 'show' as const,
      year: m.first_air_date ? new Date(m.first_air_date).getFullYear() : undefined,
      poster_url: posterUrl(m.poster_path),
      rating: m.vote_average,
      overview: m.overview,
    }));

    return {
      hero: heroPool,
      continue_watching: history.map((h) => ({
        tmdb_id: h.tmdb_id,
        title: h.title,
        type: h.type,
        poster_url: h.poster_url,
        season: h.season,
        episode: h.episode,
        position_seconds: h.position_seconds,
        duration_seconds: h.duration_seconds,
        watched_at: h.watched_at,
      })),
      trending: trendingList,
      trending_shows: trendingShowsList,
      recently_added: [...trendingMovies, ...trendingShows]
        .sort((a, b) => (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || ''))
        .slice(0, 20)
        .map((m) => ({
          tmdb_id: String(m.id),
          title: m.title || m.name || 'Untitled',
          type: (m.title ? 'movie' : 'show') as 'movie' | 'show',
          year: m.release_date ? new Date(m.release_date).getFullYear() : m.first_air_date ? new Date(m.first_air_date).getFullYear() : undefined,
          poster_url: posterUrl(m.poster_path),
          rating: m.vote_average,
        })),
      favorites: favorites.map((f) => ({
        tmdb_id: f.tmdb_id,
        title: f.title,
        type: f.type,
        poster_url: f.poster_url,
        year: f.year,
        rating: f.rating,
      })),
    };
  });
}
