// src/types/index.ts
// Shared types for the StreamHub backend

export type MediaType = 'movie' | 'show';

export interface SearchResult {
  id: string;
  provider: string;
  tmdb_id: string;
  title: string;
  type: MediaType;
  year?: number;
  poster_url?: string;
  rating?: number;
  overview?: string;
}

export interface StreamSource {
  url: string;
  quality: string;
  format: 'hls' | 'mp4' | 'dash' | 'mkv';
  label: string;
  headers?: Record<string, string>;
  subtitles?: Subtitle[];
  size?: string;
}

export interface Subtitle {
  url: string;
  language: string;
  label: string;
  source: string;
}

export interface MovieDetail {
  id: string;
  provider: string;
  tmdb_id: string;
  title: string;
  type: 'movie';
  year?: number;
  poster_url?: string;
  backdrop_url?: string;
  rating?: number;
  runtime_minutes?: number;
  genres?: string[];
  overview?: string;
  cast?: string[];
  director?: string;
  trailer_url?: string;
}

export interface ShowDetail extends Omit<MovieDetail, 'type'> {
  type: 'show';
  seasons: SeasonInfo[];
}

export interface SeasonInfo {
  number: number;
  episode_count: number;
  air_date?: string;
  name?: string;
  overview?: string;
}

export interface Episode {
  number: number;
  title: string;
  overview?: string;
  air_date?: string;
  thumbnail_url?: string;
  runtime_minutes?: number;
}

export interface ProviderInfo {
  name: string;
  version: string;
  filename: string;
  enabled: boolean;
  repo_url?: string;
  installed_at: string;
  last_updated?: string;
  status: 'active' | 'error' | 'disabled';
  language?: string;
  categories?: string[];
}

export interface HistoryEntry {
  id: number;
  tmdb_id: string;
  provider: string;
  provider_id: string;
  title: string;
  type: MediaType;
  poster_url?: string;
  season?: number;
  episode?: number;
  episode_title?: string;
  position_seconds: number;
  duration_seconds?: number;
  watched_at: string;
}

export interface FavoriteEntry {
  id: number;
  tmdb_id: string;
  provider: string;
  provider_id: string;
  title: string;
  type: MediaType;
  poster_url?: string;
  year?: number;
  rating?: number;
  added_at: string;
}

export interface AppSettings {
  admin_pin_hash?: string;
  tmdb_api_key?: string;
  omdb_api_key?: string;
  opensubtitles_api_key?: string;
  default_subtitle_language?: string;
  theme?: 'dark' | 'amoled' | 'navy';
  default_quality?: string;
  downloads_enabled?: boolean;
}
