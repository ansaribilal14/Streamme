// frontend/app/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { streamhub, HomeData } from '@/lib/api';
import { HeroSection } from '@/components/home/HeroSection';
import { PosterRow } from '@/components/home/PosterRow';
import { RowSkeleton } from '@/components/ui/Skeleton';
import { AlertCircle } from 'lucide-react';

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    streamhub.home()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="pt-16">
        <div className="h-[60vh] md:h-[80vh] shimmer" />
        <div className="py-8 space-y-6">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-20 px-4">
        <div className="max-w-md mx-auto text-center py-16">
          <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Cannot reach StreamHub backend</h2>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <p className="text-text-muted text-xs">
            Make sure the backend is running on port 4000 and the CS3 bridge on port 5000.
            You can start them with <code className="bg-surface px-2 py-0.5 rounded">/home/z/my-project/scripts/start-services.sh</code>
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="pt-0">
      <HeroSection items={data.hero} />

      <div className="relative z-10 -mt-16 md:-mt-24 space-y-2 pb-12">
        {data.continue_watching.length > 0 && (
          <PosterRow
            title="Continue Watching"
            items={data.continue_watching.map((w) => ({
              tmdb_id: w.tmdb_id,
              title: w.title,
              type: w.type,
              poster_url: w.poster_url,
              provider: 'tmdb',
              progress: { position_seconds: w.position_seconds, duration_seconds: w.duration_seconds },
              watched_at: w.watched_at,
              episode_info: w.season ? { season: w.season, episode: w.episode || 0 } : undefined,
            }))}
            emptyMessage="No watch history yet."
          />
        )}

        <PosterRow
          title="Trending Movies"
          items={data.trending.map((m) => ({ ...m, provider: 'tmdb' }))}
        />

        <PosterRow
          title="Trending Shows"
          items={data.trending_shows.map((m) => ({ ...m, provider: 'tmdb' }))}
        />

        <PosterRow
          title="Recently Added"
          items={data.recently_added.map((m) => ({ ...m, provider: 'tmdb' }))}
        />

        {data.favorites.length > 0 && (
          <PosterRow
            title="Your Favorites"
            items={data.favorites.map((f) => ({ ...f, provider: 'tmdb' }))}
            emptyMessage="No favorites yet. Tap the heart on any title to add it."
          />
        )}
      </div>
    </div>
  );
}
