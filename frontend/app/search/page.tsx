// frontend/app/search/page.tsx
'use client';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { streamhub, SearchResult } from '@/lib/api';
import { Search as SearchIcon, X, Filter } from 'lucide-react';
import { PosterCard } from '@/components/home/PosterCard';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';

const GENRES = ['All', 'Action', 'Comedy', 'Horror', 'Drama', 'Sci-Fi', 'Thriller', 'Romance'];
const TYPES = [
  { value: 'both', label: 'Both' },
  { value: 'movie', label: 'Movies' },
  { value: 'show', label: 'Shows' },
];

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="pt-20 text-center"><Spinner size={36} /></div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get('q') || '');
  const [type, setType] = useState<'both' | 'movie' | 'show'>('both');
  const [genre, setGenre] = useState('All');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);

  const doSearch = useCallback(async (query: string, typeFilter: string) => {
    if (query.trim().length < 2) {
      setResults([]);
      setProviders([]);
      return;
    }
    setLoading(true);
    try {
      const data = await streamhub.search(query, { type: typeFilter });
      setResults(data.results);
      setProviders(data.providers_searched);
    } catch (e) {
      console.error('Search failed', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const t = setTimeout(() => doSearch(q, type), 300);
    return () => clearTimeout(t);
  }, [q, type, doSearch]);

  // Sync URL with query
  useEffect(() => {
    if (q.trim()) {
      const newUrl = `/search?q=${encodeURIComponent(q.trim())}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [q]);

  return (
    <div className="pt-20 px-4 md:px-8 pb-12">
      {/* Search bar */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center bg-surface border border-border rounded-modal px-4 py-3 focus-within:border-accent transition-colors">
          <SearchIcon className="w-5 h-5 text-text-secondary mr-3" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for movies, shows..."
            autoFocus
            className="bg-transparent flex-1 text-lg outline-none placeholder:text-text-muted"
          />
          {q && (
            <button onClick={() => setQ('')} className="ml-3 p-1 text-text-secondary hover:text-text-primary">
              <X className="w-5 h-5" />
            </button>
          )}
          {loading && <Spinner size={20} className="ml-3" />}
        </div>
      </div>

      {/* Type filter pills */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-text-secondary text-sm mr-2">
          <Filter className="w-4 h-4" />
        </div>
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value as any)}
            className={`px-3 py-1.5 rounded-badge text-sm font-medium transition-colors ${
              type === t.value ? 'bg-accent text-white' : 'bg-surface text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="w-px h-6 bg-border mx-2" />
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`px-3 py-1.5 rounded-badge text-sm font-medium transition-colors ${
              genre === g ? 'bg-accent text-white' : 'bg-surface text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Providers searched */}
      {providers.length > 0 && (
        <div className="max-w-3xl mx-auto mb-4 flex items-center gap-2 flex-wrap text-xs text-text-muted">
          <span>Providers searched:</span>
          {providers.map((p) => (
            <Badge key={p} variant="outline">{p}</Badge>
          ))}
        </div>
      )}

      {/* Results grid */}
      <div className="max-w-7xl mx-auto">
        {results.length === 0 && !loading && q.trim().length >= 2 ? (
          <div className="text-center py-16 text-text-secondary">
            <SearchIcon className="w-12 h-12 mx-auto mb-4 text-text-muted" />
            <p className="text-lg">No results for "{q}"</p>
            <p className="text-sm mt-2">Try a different title or check that providers are enabled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {results.map((r, i) => (
              <div key={`${r.id}-${i}`} className="w-full">
                <PosterCard
                  tmdb_id={r.tmdb_id || r.id}
                  title={r.title}
                  type={r.type}
                  year={r.year}
                  poster_url={r.poster_url}
                  rating={r.rating}
                  provider={r.provider}
                  size="md"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
