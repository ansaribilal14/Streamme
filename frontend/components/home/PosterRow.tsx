// frontend/components/home/PosterRow.tsx
'use client';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PosterCard } from './PosterCard';

interface RowItem {
  tmdb_id: string;
  title: string;
  type: 'movie' | 'show';
  year?: number;
  poster_url?: string;
  rating?: number;
  provider?: string;
  progress?: { position_seconds: number; duration_seconds?: number };
  watched_at?: string;
  episode_info?: { season: number; episode: number };
}

interface PosterRowProps {
  title: string;
  items: RowItem[];
  size?: 'sm' | 'md' | 'lg';
  emptyMessage?: string;
}

export function PosterRow({ title, items, size = 'md', emptyMessage }: PosterRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const w = scrollRef.current.clientWidth;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -w * 0.8 : w * 0.8, behavior: 'smooth' });
  };

  if (!items || items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <section className="px-4 md:px-8 py-4">
        <h2 className="text-lg md:text-xl font-semibold mb-3">{title}</h2>
        <div className="text-text-secondary text-sm py-8 text-center bg-surface/50 rounded-card">
          {emptyMessage}
        </div>
      </section>
    );
  }

  return (
    <section className="py-4 group/row">
      <div className="flex items-center justify-between px-4 md:px-8 mb-3">
        <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full bg-surface hover:bg-surface-elevated"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full bg-surface hover:bg-surface-elevated"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar px-4 md:px-8 pb-2"
      >
        {items.map((item, i) => (
          <PosterCard key={`${item.tmdb_id}-${i}`} {...item} size={size} />
        ))}
      </div>
    </section>
  );
}
