// src/services/tmdb.ts
// TMDB metadata service - fetches posters, ratings, overviews, cast, trailers
import { logger } from './logger.js';
import { getDb } from '../db/database.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function getApiKey(): string {
  const fromDb = getDb().prepare(`SELECT value FROM settings WHERE key = 'tmdb_api_key'`).get() as { value: string } | undefined;
  return (fromDb?.value || process.env.TMDB_API_KEY || '').trim();
}

export function posterUrl(path?: string | null, size: 'w200' | 'w500' | 'original' = 'w500'): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path?: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280'): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  vote_average?: number;
  overview?: string;
  genre_ids?: number[];
}

export interface TmdbDetails {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  genres?: { id: number; name: string }[];
  overview?: string;
  tagline?: string;
  cast?: { name: string; character: string; profile_path?: string }[];
  director?: string;
  trailer_url?: string;
  seasons?: { season_number: number; episode_count: number; air_date?: string; name?: string; overview?: string }[];
}

function cacheGet(tmdb_id: string): TmdbDetails | null {
  const row = getDb().prepare(`SELECT data, fetched_at FROM metadata_cache WHERE tmdb_id = ?`).get(tmdb_id) as { data: string; fetched_at: string } | undefined;
  if (!row) return null;
  // 24h TTL
  const ageHours = (Date.now() - new Date(row.fetched_at).getTime()) / 3_600_000;
  if (ageHours > 24) return null;
  try { return JSON.parse(row.data); } catch { return null; }
}

function cacheSet(tmdb_id: string, data: TmdbDetails): void {
  getDb().prepare(`
    INSERT INTO metadata_cache (tmdb_id, data, fetched_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(tmdb_id) DO UPDATE SET data = excluded.data, fetched_at = CURRENT_TIMESTAMP
  `).run(tmdb_id, JSON.stringify(data));
}

async function tmdbFetch(path: string, params: Record<string, string> = {}): Promise<any | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn('TMDB API key missing - returning null');
    return null;
  }
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      logger.warn({ status: res.status, path }, 'TMDB request failed');
      return null;
    }
    return await res.json();
  } catch (e) {
    logger.warn({ err: (e as Error).message, path }, 'TMDB fetch error');
    return null;
  }
}

export async function searchTmdb(query: string, type: 'movie' | 'tv' | 'multi' = 'multi'): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch(`/search/${type}`, { query, include_adult: 'false' });
  return data?.results || [];
}

export async function getTmdbDetails(tmdbId: string, type: 'movie' | 'tv'): Promise<TmdbDetails | null> {
  const cacheKey = `${type}_${tmdbId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const data = await tmdbFetch(`/${type}/${tmdbId}`, { append_to_response: 'credits,videos' });
  if (!data) return null;

  const details: TmdbDetails = {
    id: data.id,
    title: data.title,
    name: data.name,
    release_date: data.release_date,
    first_air_date: data.first_air_date,
    runtime: data.runtime,
    episode_run_time: data.episode_run_time,
    poster_path: data.poster_path,
    backdrop_path: data.backdrop_path,
    vote_average: data.vote_average,
    genres: data.genres,
    overview: data.overview,
    tagline: data.tagline,
    cast: (data.credits?.cast || []).slice(0, 15).map((c: any) => ({
      name: c.name,
      character: c.character,
      profile_path: c.profile_path,
    })),
    director: (data.credits?.crew || []).find((c: any) => c.job === 'Director')?.name,
    trailer_url: (data.videos?.results || []).find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key
      ? `https://www.youtube.com/watch?v=${data.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube').key}`
      : undefined,
    seasons: (data.seasons || []).map((s: any) => ({
      season_number: s.season_number,
      episode_count: s.episode_count,
      air_date: s.air_date,
      name: s.name,
      overview: s.overview,
    })),
  };

  cacheSet(cacheKey, details);
  return details;
}

export async function getTrending(type: 'movie' | 'tv' = 'movie', window: 'day' | 'week' = 'week'): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch(`/trending/${type}/${window}`);
  return data?.results || [];
}
