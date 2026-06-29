// frontend/lib/api.ts
// StreamHub API client - talks to the Fastify backend on port 4000

const API_BASE =
  typeof window !== 'undefined'
    ? (window as any).__STREAMHUB_API__ || process.env.NEXT_PUBLIC_API_URL || '/api'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function setApiBase(url: string) {
  if (typeof window !== 'undefined') (window as any).__STREAMHUB_API__ = url;
}

export interface SearchResult {
  id: string;
  provider: string;
  tmdb_id: string;
  title: string;
  type: 'movie' | 'show';
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

export interface DetailResult {
  id: string;
  provider: string;
  tmdb_id: string;
  title: string;
  type: 'movie' | 'show';
  year?: number;
  poster_url?: string;
  backdrop_url?: string;
  rating?: number;
  runtime_minutes?: number;
  genres?: string[];
  overview?: string;
  tagline?: string;
  cast?: { name: string; character: string; avatar?: string }[];
  director?: string;
  trailer_url?: string;
  favorite?: boolean;
  history?: {
    position_seconds: number;
    duration_seconds?: number;
    season?: number;
    episode?: number;
  } | null;
  seasons?: { number: number; episode_count: number; air_date?: string; name?: string; overview?: string }[];
}

export interface Episode {
  number: number;
  title: string;
  overview?: string;
  air_date?: string;
  thumbnail_url?: string;
  runtime_minutes?: number;
}

export interface HistoryEntry {
  id: number;
  tmdb_id: string;
  provider: string;
  provider_id: string;
  title: string;
  type: 'movie' | 'show';
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
  type: 'movie' | 'show';
  poster_url?: string;
  year?: number;
  rating?: number;
  added_at: string;
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

export interface HomeData {
  hero: Array<{
    tmdb_id: string;
    title: string;
    type: 'movie' | 'show';
    year?: number;
    overview?: string;
    poster_url?: string;
    backdrop_url?: string;
    rating?: number;
  }>;
  continue_watching: Array<{
    tmdb_id: string;
    title: string;
    type: 'movie' | 'show';
    poster_url?: string;
    season?: number;
    episode?: number;
    position_seconds: number;
    duration_seconds?: number;
    watched_at: string;
  }>;
  trending: SearchResult[];
  trending_shows: SearchResult[];
  recently_added: SearchResult[];
  favorites: Array<{ tmdb_id: string; title: string; type: 'movie' | 'show'; poster_url?: string; year?: number; rating?: number }>;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = `API ${path} returned ${res.status}`;
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const streamhub = {
  home: () => api<HomeData>('/home'),

  search: (q: string, opts?: { type?: string; providers?: string }) => {
    const params = new URLSearchParams({ q });
    if (opts?.type) params.set('type', opts.type);
    if (opts?.providers) params.set('providers', opts.providers);
    return api<{ results: SearchResult[]; providers_searched: string[]; total: number }>(`/search?${params}`);
  },

  details: (provider: string, id: string, type?: 'movie' | 'show') => {
    const params = type ? `?type=${type}` : '';
    return api<DetailResult>(`/details/${encodeURIComponent(provider)}/${encodeURIComponent(id)}${params}`);
  },

  episodes: (provider: string, id: string, season: number) =>
    api<{ season: number; episodes: Episode[] }>(`/episodes/${encodeURIComponent(provider)}/${encodeURIComponent(id)}?season=${season}`),

  stream: (provider: string, id: string, season?: number, episode?: number) => {
    const params = new URLSearchParams();
    if (season) params.set('season', String(season));
    if (episode) params.set('episode', String(episode));
    const q = params.toString() ? `?${params.toString()}` : '';
    return api<{ streams: StreamSource[] }>(`/stream/${encodeURIComponent(provider)}/${encodeURIComponent(id)}${q}`);
  },

  subtitles: (tmdb_id: string, season?: number, episode?: number, language = 'en') => {
    const params = new URLSearchParams({ tmdb_id, language });
    if (season) params.set('season', String(season));
    if (episode) params.set('episode', String(episode));
    return api<{ subtitles: Subtitle[] }>(`/subtitles?${params}`);
  },

  history: {
    list: () => api<{ history: HistoryEntry[] }>('/history'),
    upsert: (entry: Partial<HistoryEntry>) => api<{ ok: boolean }>('/history', { method: 'POST', body: JSON.stringify(entry) }),
    delete: (tmdb_id: string) => api<{ ok: boolean }>(`/history/${encodeURIComponent(tmdb_id)}`, { method: 'DELETE' }),
    clear: () => api<{ ok: boolean }>('/history', { method: 'DELETE' }),
  },

  favorites: {
    list: (sort?: 'recent' | 'az' | 'rating') => api<{ favorites: FavoriteEntry[] }>(`/favorites${sort ? `?sort=${sort}` : ''}`),
    add: (entry: Partial<FavoriteEntry>) => api<{ ok: boolean }>('/favorites', { method: 'POST', body: JSON.stringify(entry) }),
    remove: (tmdb_id: string) => api<{ ok: boolean }>(`/favorites/${encodeURIComponent(tmdb_id)}`, { method: 'DELETE' }),
  },

  admin: {
    hasPin: () => api<{ has_pin: boolean }>('/admin/has-pin'),
    setupPin: (pin: string) => api<{ ok: boolean; message?: string }>('/admin/setup', { method: 'POST', body: JSON.stringify({ pin }) }),
    verifyPin: (pin: string) => api<{ ok: boolean }>('/admin/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) }),
    changePin: (new_pin: string) => api<{ ok: boolean }>('/admin/change-pin', { method: 'POST', headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' }, body: JSON.stringify({ new_pin }) }),
    providers: () => api<{ providers: ProviderInfo[] }>('/admin/providers', { headers: { 'X-Admin-PIN': (typeof window !== 'undefined' && sessionStorage.getItem('admin_pin')) || '' } }),
    enableProvider: (name: string) => api<{ ok: boolean }>(`/admin/providers/enable/${encodeURIComponent(name)}`, { method: 'POST', headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' } }),
    disableProvider: (name: string) => api<{ ok: boolean }>(`/admin/providers/disable/${encodeURIComponent(name)}`, { method: 'POST', headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' } }),
    installProvider: (data: any) => api<{ ok: boolean }>('/admin/providers/install', { method: 'POST', headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' }, body: JSON.stringify(data) }),
    removeProvider: (name: string) => api<{ ok: boolean }>(`/admin/providers/${encodeURIComponent(name)}`, { method: 'DELETE', headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' } }),
    updateProviders: () => api<{ ok: boolean }>('/admin/providers/update', { method: 'POST', headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' } }),
    logs: (filter?: 'error' | 'warn' | 'info') => api<{ logs: any[] }>(`/admin/logs${filter ? `?filter=${filter}` : ''}`, { headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' } }),
    clearLogs: () => api<{ ok: boolean }>('/admin/logs', { method: 'DELETE', headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' } }),
    cacheStats: () => api<{ metadata_count: number; subtitle_count: number; db_size_bytes: number }>('/admin/cache/stats', { headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' } }),
    clearCache: () => api<{ ok: boolean }>('/admin/cache/clear', { method: 'POST', headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' } }),
    health: () => api<{ backend: string; cs3_bridge: string; database: string; timestamp: string }>('/admin/health'),
    settings: () => api<{ settings: Record<string, string> }>('/admin/settings', { headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' } }),
    updateSettings: (settings: Record<string, string>) => api<{ ok: boolean }>('/admin/settings', { method: 'POST', headers: { 'X-Admin-PIN': sessionStorage.getItem('admin_pin') || '' }, body: JSON.stringify(settings) }),
  },
};
