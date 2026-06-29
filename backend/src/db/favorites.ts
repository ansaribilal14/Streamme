// src/db/favorites.ts
import { getDb } from './database.js';
import type { FavoriteEntry } from '../types/index.js';

export interface AddFavoriteInput {
  tmdb_id: string;
  provider: string;
  provider_id: string;
  title: string;
  type: 'movie' | 'show';
  poster_url?: string;
  year?: number;
  rating?: number;
}

export function addFavorite(input: AddFavoriteInput): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO favorites (tmdb_id, provider, provider_id, title, type, poster_url, year, rating, added_at)
    VALUES (@tmdb_id, @provider, @provider_id, @title, @type, @poster_url, @year, @rating, CURRENT_TIMESTAMP)
    ON CONFLICT(tmdb_id) DO UPDATE SET
      provider = excluded.provider,
      provider_id = excluded.provider_id,
      title = excluded.title,
      poster_url = COALESCE(excluded.poster_url, favorites.poster_url),
      year = COALESCE(excluded.year, favorites.year),
      rating = COALESCE(excluded.rating, favorites.rating)
  `).run(input);
}

export function removeFavorite(tmdb_id: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM favorites WHERE tmdb_id = ?`).run(tmdb_id);
}

export function getFavorites(sortBy: 'recent' | 'az' | 'rating' = 'recent'): FavoriteEntry[] {
  const db = getDb();
  const orderBy =
    sortBy === 'az' ? 'title COLLATE NOCASE ASC' :
    sortBy === 'rating' ? 'rating DESC NULLS LAST' :
    'added_at DESC';
  return db.prepare(`SELECT * FROM favorites ORDER BY ${orderBy}`).all() as FavoriteEntry[];
}

export function isFavorite(tmdb_id: string): boolean {
  const db = getDb();
  const row = db.prepare(`SELECT 1 FROM favorites WHERE tmdb_id = ?`).get(tmdb_id);
  return !!row;
}
