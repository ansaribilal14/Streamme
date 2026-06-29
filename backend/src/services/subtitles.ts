// src/services/subtitles.ts
// Subtitle aggregation: OpenSubtitles + SubDL with caching
import { logger, pushLogBuffer } from './logger.js';
import { getDb } from '../db/database.js';
import type { Subtitle } from '../types/index.js';

function getFromCache(tmdb_id: string, season?: number, episode?: number, language = 'en'): Subtitle[] {
  const rows = getDb().prepare(`
    SELECT url, language, source, label FROM subtitle_cache
    WHERE tmdb_id = ? AND COALESCE(season, -1) = ? AND COALESCE(episode, -1) = ? AND language = ?
    AND cached_at > datetime('now', '-7 days')
  `).all(tmdb_id, season ?? -1, episode ?? -1, language) as { url: string; language: string; source: string; label: string | null }[];
  return rows.map((r) => ({
    url: r.url,
    language: r.language,
    label: r.label || r.language,
    source: r.source,
  }));
}

function saveToCache(subs: Subtitle[], tmdb_id: string, season?: number, episode?: number): void {
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO subtitle_cache (tmdb_id, season, episode, language, source, url, label, cached_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  for (const s of subs) {
    stmt.run(tmdb_id, season ?? null, episode ?? null, s.language, s.source, s.url, s.label);
  }
}

export async function searchSubtitles(
  tmdb_id: string,
  season?: number,
  episode?: number,
  language = 'en'
): Promise<Subtitle[]> {
  // 1. Check cache
  const cached = getFromCache(tmdb_id, season, episode, language);
  if (cached.length) {
    logger.debug({ count: cached.length }, 'Subtitles served from cache');
    return cached;
  }

  const results: Subtitle[] = [];

  // 2. Try OpenSubtitles (mock if no key)
  const osKey = (getDb().prepare(`SELECT value FROM settings WHERE key = 'opensubtitles_api_key'`).get() as { value: string } | undefined)?.value
    || process.env.OPENSUBTITLES_API_KEY;
  if (osKey) {
    try {
      // OpenSubtitles v1 API
      const url = new URL('https://api.opensubtitles.com/api/v1/subtitles');
      url.searchParams.set('imdb_id', tmdb_id);
      url.searchParams.set('languages', language);
      if (season) url.searchParams.set('season_number', String(season));
      if (episode) url.searchParams.set('episode_number', String(episode));
      const res = await fetch(url, {
        headers: { 'Api-Key': osKey, 'User-Agent': 'StreamHub v1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        for (const item of (data.data || []).slice(0, 5)) {
          results.push({
            url: item.attributes?.url || '',
            language,
            label: `OpenSubtitles · ${language}`,
            source: 'opensubtitles',
          });
        }
      }
    } catch (e) {
      pushLogBuffer('warn', `OpenSubtitles fetch failed: ${(e as Error).message}`);
    }
  }

  // 3. Try SubDL as fallback (mock if no key)
  const subdlKey = (getDb().prepare(`SELECT value FROM settings WHERE key = 'subdl_api_key'`).get() as { value: string } | undefined)?.value
    || process.env.SUBDL_API_KEY;
  if (results.length === 0 && subdlKey) {
    try {
      const url = new URL('https://api.subdl.com/api/v1/subtitles');
      url.searchParams.set('api_key', subdlKey);
      url.searchParams.set('tmdb_id', tmdb_id);
      url.searchParams.set('language', language);
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        for (const item of (data.subtitles || []).slice(0, 5)) {
          results.push({
            url: item.url || '',
            language,
            label: `SubDL · ${language}`,
            source: 'subdl',
          });
        }
      }
    } catch (e) {
      pushLogBuffer('warn', `SubDL fetch failed: ${(e as Error).message}`);
    }
  }

  // 4. If we still have no results, return a fallback subtitle stub
  //    (the frontend can synthesize a WebVTT cue file from this)
  if (results.length === 0) {
    results.push({
      url: `data:text/vtt;charset=utf-8,WEBVTT%0A%0A1%0A00:00:01.000%20-->%2000:00:04.000%0ASubtitles%20unavailable%20for%20this%20title`,
      language,
      label: `No subtitle available`,
      source: 'fallback',
    });
  }

  saveToCache(results, tmdb_id, season, episode);
  return results;
}
