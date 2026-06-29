// frontend/store/playerStore.ts
// Zustand store for the video player state - passes stream info from detail
// page to the player page without using URL params (which would leak tokens).
import { create } from 'zustand';
import type { StreamSource } from '../lib/api';

interface PlayerState {
  streamUrl: string | null;
  streamFormat: 'hls' | 'mp4' | 'dash' | 'mkv' | null;
  title: string;
  episodeTitle?: string;
  posterUrl?: string;
  tmdb_id: string;
  provider: string;
  provider_id: string;
  type: 'movie' | 'show';
  season?: number;
  episode?: number;
  startPosition: number;
  duration?: number;
  availableStreams: StreamSource[];
  setPlayer: (state: Partial<PlayerState>) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  streamUrl: null,
  streamFormat: null,
  title: '',
  episodeTitle: '',
  posterUrl: '',
  tmdb_id: '',
  provider: '',
  provider_id: '',
  type: 'movie',
  season: undefined,
  episode: undefined,
  startPosition: 0,
  duration: undefined,
  availableStreams: [],
  setPlayer: (s) => set((prev) => ({ ...prev, ...s })),
  reset: () => set({
    streamUrl: null, streamFormat: null, title: '', episodeTitle: '',
    posterUrl: '', tmdb_id: '', provider: '', provider_id: '',
    type: 'movie', season: undefined, episode: undefined,
    startPosition: 0, duration: undefined, availableStreams: [],
  }),
}));
