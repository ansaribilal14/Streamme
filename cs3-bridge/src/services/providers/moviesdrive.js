// cs3-bridge/src/services/providers/moviesdrive.js
import { BaseProvider, SAMPLE_CATALOG, DEMO_STREAMS } from './base.js';

export class MoviesDriveProvider extends BaseProvider {
  constructor() {
    super({
      name: 'MoviesDrive',
      version: '1.8',
      language: 'hi',
      categories: ['movies', 'shows'],
      baseUrl: 'https://moviesdrive.local',
    });
  }

  async search(query) {
    const q = query.toLowerCase();
    return SAMPLE_CATALOG
      .filter(item => item.title.toLowerCase().includes(q))
      .map(item => ({
        id: `${this.name.toLowerCase()}::${item.id}`,
        provider: this.name,
        tmdb_id: '',
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
      overview: item.overview, runtime_minutes: 110, genres: ['Thriller'],
      cast: [], director: 'Unknown',
    };
  }

  async episodes(id, season) {
    const catalogId = id.split('::').pop();
    const item = SAMPLE_CATALOG.find(c => c.id === catalogId);
    if (!item || item.type !== 'show') return [];
    return Array.from({ length: 10 }, (_, i) => ({
      number: i + 1, title: `Episode ${i + 1}`,
      overview: '', air_date: `${item.year}-01-${String(i + 1).padStart(2, '0')}`,
      runtime_minutes: 40,
    }));
  }

  async streams() {
    return [
      { url: DEMO_STREAMS.hls, quality: '1080p', format: 'hls', label: `${this.name} · 1080p HLS`, subtitles: [] },
      { url: DEMO_STREAMS.mp4_720, quality: '720p', format: 'mp4', label: `${this.name} · 720p`, subtitles: [] },
    ];
  }
}
