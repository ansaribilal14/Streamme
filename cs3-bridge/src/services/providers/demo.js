// cs3-bridge/src/services/providers/demo.js
import { BaseProvider, SAMPLE_CATALOG, DEMO_STREAMS, seededRandom } from './base.js';

// The Demo provider always responds - ensures the system is functional
// even when no real provider has any results.
export class DemoProvider extends BaseProvider {
  constructor() {
    super({
      name: 'StreamHub',
      version: '1.0',
      language: 'en',
      categories: ['movies', 'shows'],
      baseUrl: 'https://demo.streamhub.local',
    });
  }

  async search(query) {
    const q = query.toLowerCase();
    return SAMPLE_CATALOG.filter(item =>
      item.title.toLowerCase().includes(q) ||
      String(item.year).includes(q)
    ).map(item => ({
      id: `${this.name.toLowerCase()}::${item.id}`,
      provider: this.name,
      tmdb_id: '',
      title: item.title,
      type: item.type,
      year: item.year,
      rating: item.rating,
      overview: item.overview,
    }));
  }

  async details(id) {
    const catalogId = id.split('::').pop();
    const item = SAMPLE_CATALOG.find(c => c.id === catalogId);
    if (!item) return null;
    return {
      id,
      provider: this.name,
      tmdb_id: '',
      title: item.title,
      type: item.type,
      year: item.year,
      rating: item.rating,
      overview: item.overview,
      runtime_minutes: item.type === 'movie' ? 120 + Math.floor(seededRandom(item.id)() * 60) : 45,
      genres: ['Demo'],
      cast: [],
      director: 'Demo Director',
    };
  }

  async episodes(id, season) {
    const catalogId = id.split('::').pop();
    const item = SAMPLE_CATALOG.find(c => c.id === catalogId);
    if (!item || item.type !== 'show') return [];
    const epCount = 8 + (season % 4);
    return Array.from({ length: epCount }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
      overview: `Demo episode ${i + 1} of season ${season}.`,
      air_date: `${item.year}-${String(season).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      runtime_minutes: 45,
    }));
  }

  async streams(id, season, episode) {
    return [
      {
        url: DEMO_STREAMS.hls,
        quality: '1080p',
        format: 'hls',
        label: `${this.name} · 1080p HLS`,
        subtitles: [],
      },
      {
        url: DEMO_STREAMS.mp4_1080,
        quality: '1080p',
        format: 'mp4',
        label: `${this.name} · 1080p MP4`,
        subtitles: [],
      },
      {
        url: DEMO_STREAMS.mp4_720,
        quality: '720p',
        format: 'mp4',
        label: `${this.name} · 720p MP4`,
        subtitles: [],
      },
    ];
  }
}
