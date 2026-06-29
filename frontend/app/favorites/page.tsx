// frontend/app/favorites/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { streamhub, FavoriteEntry } from '@/lib/api';
import { PosterCard } from '@/components/home/PosterCard';
import { Spinner } from '@/components/ui/Spinner';
import { Heart, Trash2 } from 'lucide-react';

type SortOption = 'recent' | 'az' | 'rating';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const load = () => {
    setLoading(true);
    streamhub.favorites.list(sortBy)
      .then((d) => setFavorites(d.favorites))
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [sortBy]);

  const removeOne = async (tmdb_id: string) => {
    await streamhub.favorites.remove(tmdb_id);
    load();
  };

  return (
    <div className="pt-20 px-4 md:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
              <Heart className="w-7 h-7 text-accent fill-accent" />
              My Favorites
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {favorites.length} {favorites.length === 1 ? 'title' : 'titles'} in your list
            </p>
          </div>
          {favorites.length > 0 && (
            <div className="flex items-center gap-2">
              {(['recent', 'az', 'rating'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSortBy(opt)}
                  className={`px-3 py-1.5 rounded-badge text-sm font-medium transition-colors ${
                    sortBy === opt ? 'bg-accent text-white' : 'bg-surface text-text-secondary hover:bg-surface-elevated'
                  }`}
                >
                  {opt === 'recent' ? 'Recently Added' : opt === 'az' ? 'A–Z' : 'Rating'}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16"><Spinner size={36} /></div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary mb-2">Your favorites list is empty.</p>
            <p className="text-text-muted text-sm">Tap the heart icon on any title to add it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {favorites.map((f) => (
              <div key={f.tmdb_id} className="relative group">
                <PosterCard
                  tmdb_id={f.tmdb_id}
                  title={f.title}
                  type={f.type}
                  poster_url={f.poster_url}
                  year={f.year}
                  rating={f.rating}
                  provider={f.provider}
                />
                <button
                  onClick={(e) => { e.preventDefault(); removeOne(f.tmdb_id); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-accent"
                  aria-label="Remove from favorites"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
