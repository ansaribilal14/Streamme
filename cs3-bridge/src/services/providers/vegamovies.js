// cs3-bridge/src/services/providers/vegamovies.js
import { BaseProvider, SAMPLE_CATALOG, DEMO_STREAMS, seededRandom } from './base.js';

// VegaMovies provider adapter - returns sample catalog results that match
// the same shape CloudStream extensions return. A future version can be
// upgraded to actually scrape the live site (or call out to a real .cs3
// extension running in a JVM subprocess).
export class VegaMoviesProvider extends BaseProvider {
  constructor() {
    super({
      name: 'VegaMovies',
      version: '1.4',
      language: 'hi',
      categories: ['movies', 'shows'],
      baseUrl: 'https://vegamovies.local',
    });
  }

  async search(query) {
    const q = query.toLowerCase();
    return SAMPLE_CATALOG
      .filter(item => item.type === 'movie')
      .filter(item => item.title.toLowerCase().includes(q))
      .map(item => ({
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
      runtime_minutes: 130,
      genres: ['Action', 'Adventure'],
      cast: ['Robert Downey Jr.', 'Chris Evans', 'Scarlett Johansson'],
      director: 'Anthony & Joe Russo',
    };
  }

  async episodes() { return []; }

  async streams(id) {
    return [
      { url: DEMO_STREAMS.hls, quality: '1080p', format: 'hls', label: `${this.name} · 1080p HLS`, subtitles: [] },
      { url: DEMO_STREAMS.mp4_1080, quality: '1080p', format: 'mp4', label: `${this.name} · 1080p MP4`, subtitles: [] },
      { url: DEMO_STREAMS.mp4_720, quality: '720p', format: 'mp4', label: `${this.name} · 720p MP4`, subtitles: [] },
      { url: DEMO_STREAMS.mp4_540, quality: '540p', format: 'mp4', label: `${this.name} · 540p MP4`, subtitles: [] },
    ];
  }
}
