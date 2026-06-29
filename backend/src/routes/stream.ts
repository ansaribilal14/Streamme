// src/routes/stream.ts
import type { FastifyInstance } from 'fastify';
import { getStreamsFromBridge } from '../services/cs3Bridge.js';
import { searchSubtitles } from '../services/subtitles.js';
import { logger } from '../services/logger.js';

export async function streamRoutes(app: FastifyInstance) {
  app.get('/stream/:provider/:id', async (req, reply) => {
    const { provider, id } = req.params as { provider: string; id: string };
    const season = (req.query as { season?: string }).season ? Number((req.query as { season?: string }).season) : undefined;
    const episode = (req.query as { episode?: string }).episode ? Number((req.query as { episode?: string }).episode) : undefined;

    let streams = await getStreamsFromBridge(provider, id, season, episode);

    // If no streams from bridge, return a sample stream (Big Buck Bunny) so the UI is always functional
    if (streams.length === 0) {
      logger.info({ provider, id }, 'No bridge streams - returning demo stream');
      streams = [
        {
          url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          quality: '1080p',
          format: 'hls' as const,
          label: `${provider} · Demo 1080p HLS`,
          subtitles: [],
        },
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          quality: '720p',
          format: 'mp4' as const,
          label: `${provider} · Demo 720p MP4`,
          subtitles: [],
        },
      ];
    }

    // Attach subtitles if we have a tmdb_id (we use the `id` field for the cache key)
    let tmdbId = id;
    if (id.startsWith('tmdb::')) tmdbId = id.slice(6);
    else if (/^\d+$/.test(id)) tmdbId = id;
    else tmdbId = `hash_${id}`;

    const subs = await searchSubtitles(tmdbId, season, episode, 'en');
    streams = streams.map((s) => ({ ...s, subtitles: s.subtitles?.length ? s.subtitles : subs }));

    return { streams };
  });
}
