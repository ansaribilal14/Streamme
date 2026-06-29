// src/services/cs3Bridge.ts
// Client for the CS3 Bridge microservice (Kotlin/Ktor or Node fallback on port 5000)
import { logger, pushLogBuffer } from './logger.js';
import type {
  SearchResult, MovieDetail, ShowDetail, SeasonInfo,
  Episode, StreamSource, Subtitle, ProviderInfo
} from '../types/index.js';

const BRIDGE_URL = process.env.CS3_BRIDGE_URL || 'http://localhost:5000';
const BRIDGE_TIMEOUT_MS = 15000;

async function fetchBridge(path: string, opts: RequestInit = {}): Promise<any> {
  const url = `${BRIDGE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Bridge ${path} returned ${res.status}: ${text}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function bridgeHealth(): Promise<boolean> {
  try {
    await fetchBridge('/health');
    return true;
  } catch {
    return false;
  }
}

export async function listProvidersFromBridge(): Promise<ProviderInfo[]> {
  try {
    const data = await fetchBridge('/providers');
    return data.providers || [];
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'CS3 bridge /providers failed');
    return [];
  }
}

export async function searchAcrossProviders(
  query: string,
  providers: string[]
): Promise<SearchResult[]> {
  const providerParam = providers.length ? providers.join(',') : 'all';
  try {
    const data = await fetchBridge(`/search?q=${encodeURIComponent(query)}&providers=${encodeURIComponent(providerParam)}`);
    return data.results || [];
  } catch (e) {
    pushLogBuffer('error', `Bridge search failed: ${(e as Error).message}`);
    logger.error({ err: (e as Error).message }, 'Bridge search failed');
    return [];
  }
}

export async function getDetailsFromBridge(provider: string, id: string): Promise<MovieDetail | ShowDetail | null> {
  try {
    return await fetchBridge(`/details/${encodeURIComponent(provider)}/${encodeURIComponent(id)}`);
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'Bridge details failed');
    return null;
  }
}

export async function getEpisodesFromBridge(
  provider: string, id: string, season: number
): Promise<Episode[]> {
  try {
    const data = await fetchBridge(`/episodes/${encodeURIComponent(provider)}/${encodeURIComponent(id)}?season=${season}`);
    return data.episodes || [];
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'Bridge episodes failed');
    return [];
  }
}

export async function getStreamsFromBridge(
  provider: string, id: string, season?: number, episode?: number
): Promise<StreamSource[]> {
  try {
    let path = `/streams/${encodeURIComponent(provider)}/${encodeURIComponent(id)}`;
    const params = new URLSearchParams();
    if (season !== undefined) params.set('season', String(season));
    if (episode !== undefined) params.set('episode', String(episode));
    if (params.toString()) path += `?${params.toString()}`;
    const data = await fetchBridge(path);
    return data.streams || [];
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'Bridge streams failed');
    return [];
  }
}

export async function reloadBridge(): Promise<boolean> {
  try {
    await fetchBridge('/reload', { method: 'POST' });
    return true;
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'Bridge reload failed');
    return false;
  }
}

export async function getSeasonsFromBridge(provider: string, id: string): Promise<SeasonInfo[]> {
  try {
    const data = await fetchBridge(`/seasons/${encodeURIComponent(provider)}/${encodeURIComponent(id)}`);
    return data.seasons || [];
  } catch {
    return [];
  }
}
