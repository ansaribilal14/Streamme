// cs3-bridge/src/services/providers/castletv.js
import { BaseProvider, SAMPLE_CATALOG, DEMO_STREAMS } from './base.js';

export class CastleTVProvider extends BaseProvider {
  constructor() {
    super({
      name: 'CastleTV',
      version: '1.2',
      language: 'en',
      categories: ['shows'],
      baseUrl: 'https://castletv.local',
    });
  }

  async search(query) {
    const q = query.toLowerCase();
    return SAMPLE_CATALOG
      .filter(item => item.type === 'show')
      .filter(item => item.title.toLowerCase().includes(q))
      .map(item => ({
        id: `${this.name.toLowerCase()}::${item.id}`,
        provider: this.name, tmdb_id: '',
        title: item.title, type: item.type, year: item.year,
        rating: item.rating, overview: item.overview,
      }));
  }

  async details(id) {
    const catalogId = id.split('::').pop();
    const item = SAMPLE_CATALOG.find(c => c.id === catalogId);
    if (!item) return null;
    return {
      id, provider: this.name, tmdb_id: '',
      title: item.title, type: item.type, year: item.year, rating: item.rating,
      overview: item.overview, runtime_minutes: 50, genres: ['TV'],
      cast: [], director: '',
      seasons: [
        { number: 1, episode_count: 10, air_date: `${item.year}-09-12`, name: 'Season 1' },
        { number: 2, episode_count: 10, air_date: `${item.year + 1}-09-12`, name: 'Season 2' },
        { number: 3, episode_count: 8, air_date: `${item.year + 2}-09-12`, name: 'Season 3' },
      ],
    };
  }

  async episodes(id, season) {
    const catalogId = id.split('::').pop();
    const item = SAMPLE_CATALOG.find(c => c.id === catalogId);
    if (!item || item.type !== 'show') return [];
    const count = season === 3 ? 8 : 10;
    return Array.from({ length: count }, (_, i) => ({
      number: i + 1, title: `Episode ${i + 1}`,
      overview: `Season ${season} episode ${i + 1} of ${item.title}.`,
      air_date: `${item.year}-${String(season).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
      runtime_minutes: 50,
    }));
  }

  async streams(id, season, episode) {
    return [
      { url: DEMO_STREAMS.hls, quality: '1080p', format: 'hls', label: `${this.name} · S${season}E${episode} 1080p`, subtitles: [] },
      { url: DEMO_STREAMS.mp4_720, quality: '720p', format: 'mp4', label: `${this.name} · S${season}E${episode} 720p`, subtitles: [] },
    ];
  }
}
