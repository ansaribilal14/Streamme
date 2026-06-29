// cs3-bridge/src/services/providers/base.js
// Base provider interface. Each provider implements: search, details, episodes, streams.
// Mirrors the MainAPI contract in CloudStream extensions.

export class BaseProvider {
  constructor(opts) {
    this.name = opts.name;
    this.version = opts.version || '1.0';
    this.language = opts.language || 'en';
    this.categories = opts.categories || ['movies'];
    this.baseUrl = opts.baseUrl || '';
    this.enabled = true;
  }

  /**
   * @param {string} query
   * @returns {Promise<Array>}
   */
  async search(query) {
    throw new Error('Not implemented');
  }

  /**
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async details(id) {
    throw new Error('Not implemented');
  }

  /**
   * @param {string} id
   * @param {number} season
   * @returns {Promise<Array>}
   */
  async episodes(id, season) {
    return [];
  }

  /**
   * @param {string} id
   * @param {number?} season
   * @param {number?} episode
   * @returns {Promise<Array>}
   */
  async streams(id, season, episode) {
    return [];
  }

  info() {
    return {
      name: this.name,
      version: this.version,
      language: this.language,
      categories: this.categories,
      baseUrl: this.baseUrl,
      enabled: this.enabled,
    };
  }
}

// Helper - deterministic pseudo-random based on string input (used so demo
// results are stable across reloads but vary per query).
export function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) * 16777619;
  }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sample movie/show catalog used by all demo providers - real providers
// would scrape their site instead.
export const SAMPLE_CATALOG = [
  { id: 'avengers-endgame', title: 'Avengers: Endgame', year: 2019, type: 'movie', rating: 8.4,
    overview: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more to reverse Thanos\' actions and restore balance to the universe.' },
  { id: 'inception', title: 'Inception', year: 2010, type: 'movie', rating: 8.8,
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.' },
  { id: 'interstellar', title: 'Interstellar', year: 2014, type: 'movie', rating: 8.6,
    overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.' },
  { id: 'dark-knight', title: 'The Dark Knight', year: 2008, type: 'movie', rating: 9.0,
    overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and DA Harvey Dent.' },
  { id: 'joker', title: 'Joker', year: 2019, type: 'movie', rating: 8.4,
    overview: 'A mentally troubled stand-up comedian embarks on a downward spiral that leads to the creation of an iconic villain.' },
  { id: 'parasite', title: 'Parasite', year: 2019, type: 'movie', rating: 8.5,
    overview: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.' },
  { id: 'dune', title: 'Dune', year: 2021, type: 'movie', rating: 8.0,
    overview: 'Feature adaptation of Frank Herbert\'s science fiction novel about the son of a noble family entrusted with the protection of the most valuable asset in the galaxy.' },
  { id: 'spider-man-nwh', title: 'Spider-Man: No Way Home', year: 2021, type: 'movie', rating: 8.2,
    overview: 'With Spider-Man\'s identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear.' },
  { id: 'oppenheimer', title: 'Oppenheimer', year: 2023, type: 'movie', rating: 8.4,
    overview: 'The story of J. Robert Oppenheimer and his role in the development of the atomic bomb.' },
  { id: 'barbie', title: 'Barbie', year: 2023, type: 'movie', rating: 6.9,
    overview: 'Barbie suffers a crisis that leads her to question her world and her existence.' },
  { id: 'breaking-bad', title: 'Breaking Bad', year: 2008, type: 'show', rating: 9.5,
    overview: 'A chemistry teacher diagnosed with cancer turns to a life of crime, producing and selling methamphetamine.' },
  { id: 'stranger-things', title: 'Stranger Things', year: 2016, type: 'show', rating: 8.7,
    overview: 'When a young boy disappears, his mother, a police chief, and his friends must confront terrifying forces to get him back.' },
  { id: 'wednesday', title: 'Wednesday', year: 2022, type: 'show', rating: 8.1,
    overview: 'Wednesday Addams investigates a murderous spree while making new friends and foes at Nevermore Academy.' },
  { id: 'the-last-of-us', title: 'The Last of Us', year: 2023, type: 'show', rating: 8.8,
    overview: 'After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity\'s last hope.' },
  { id: 'house-of-the-dragon', title: 'House of the Dragon', year: 2022, type: 'show', rating: 8.4,
    overview: 'The Targaryen dynasty is at the absolute apex of its power, with over 15 dragons under their yoke.' },
  { id: 'money-heist', title: 'Money Heist', year: 2017, type: 'show', rating: 8.2,
    overview: 'An unusual group of robbers attempt to carry out the most perfect robbery in Spanish history.' },
];

// Demo stream URLs - publicly available test streams
export const DEMO_STREAMS = {
  hls: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  mp4_1080: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  mp4_720: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  mp4_540: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
};
