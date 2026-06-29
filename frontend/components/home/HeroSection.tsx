// frontend/components/home/HeroSection.tsx
'use client';
import { useState, useEffect } from 'react';
import { Play, Info, Star } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';

interface HeroItem {
  tmdb_id: string;
  title: string;
  type: 'movie' | 'show';
  year?: number;
  overview?: string;
  poster_url?: string;
  backdrop_url?: string;
  rating?: number;
}

export function HeroSection({ items }: { items: HeroItem[] }) {
  const [index, setIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
      setImgLoaded(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (!items || items.length === 0) {
    return (
      <div className="h-[60vh] md:h-[80vh] bg-surface flex items-center justify-center">
        <Spinner size={36} />
      </div>
    );
  }

  const item = items[index];
  const bgUrl = item.backdrop_url || item.poster_url;

  return (
    <section className="relative h-[70vh] md:h-[85vh] w-full overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        {bgUrl ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 shimmer" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bgUrl}
              alt={item.title}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-700 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface-elevated to-surface" />
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 hero-gradient-left" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end pb-16 md:pb-24">
        <div className="px-4 md:px-12 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent font-bold tracking-widest text-sm">FEATURED</span>
            {item.rating && (
              <span className="flex items-center gap-1 text-text-secondary text-sm">
                <Star className="w-4 h-4 fill-warning text-warning" />
                {item.rating.toFixed(1)}
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-3 leading-tight">
            {item.title}
          </h1>
          <div className="flex items-center gap-3 text-text-secondary text-sm mb-4">
            <span>{item.year}</span>
            <span className="px-2 py-0.5 border border-border rounded-badge uppercase text-xs">
              {item.type}
            </span>
          </div>
          <p className="text-text-secondary text-base md:text-lg mb-6 line-clamp-3 max-w-2xl">
            {item.overview || 'No overview available.'}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href={`/${item.type}/${item.tmdb_id}?provider=tmdb`}
              className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-btn font-semibold hover:bg-white/90 transition-colors"
            >
              <Play className="w-5 h-5 fill-black" />
              Watch Now
            </Link>
            <Link
              href={`/${item.type}/${item.tmdb_id}?provider=tmdb`}
              className="flex items-center gap-2 bg-surface-elevated/80 text-text-primary px-6 py-2.5 rounded-btn font-semibold hover:bg-surface-elevated transition-colors backdrop-blur-sm"
            >
              <Info className="w-5 h-5" />
              More Info
            </Link>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 md:right-12 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); setImgLoaded(false); }}
              className={`h-1 rounded-full transition-all ${
                i === index ? 'w-8 bg-accent' : 'w-4 bg-text-muted hover:bg-text-secondary'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
