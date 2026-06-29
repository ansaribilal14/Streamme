// cs3-bridge/src/services/providers/bollyflix.js
import { BaseProvider, SAMPLE_CATALOG, DEMO_STREAMS } from './base.js';

export class BollyflixProvider extends BaseProvider {
  constructor() {
    super({
      name: 'Bollyflix',
      version: '1.6',
      language: 'hi',
      categories: ['movies'],
      baseUrl: 'https://bollyflix.local',
    });
  }

  async search(query) {
    const q = query.toLowerCase();
    return SAMPLE_CATALOG
      .filter(item => item.type === 'movie')
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
      overview: item.overview, runtime_minutes: 140, genres: ['Bollywood'],
      cast: [], director: 'Unknown',
    };
  }

  async episodes() { return []; }

  async streams() {
    return [
      { url: DEMO_STREAMS.mp4_1080, quality: '1080p', format: 'mp4', label: `${this.name} · 1080p`, subtitles: [] },
    ];
  }
}
