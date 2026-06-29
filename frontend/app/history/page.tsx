// frontend/app/history/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { streamhub, HistoryEntry } from '@/lib/api';
import { PosterCard } from '@/components/home/PosterCard';
import { Spinner } from '@/components/ui/Spinner';
import { Trash2, History as HistoryIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = () => {
    setLoading(true);
    streamhub.history.list()
      .then((d) => setHistory(d.history))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const clearAll = async () => {
    await streamhub.history.clear();
    setConfirmClear(false);
    load();
  };

  const removeOne = async (tmdb_id: string) => {
    await streamhub.history.delete(tmdb_id);
    load();
  };

  return (
    <div className="pt-20 px-4 md:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
              <HistoryIcon className="w-7 h-7 text-accent" />
              Watch History
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {history.length} {history.length === 1 ? 'title' : 'titles'} watched
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-2 bg-surface hover:bg-surface-elevated border border-border px-4 py-2 rounded-btn text-sm font-medium text-warning"
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16"><Spinner size={36} /></div>
        ) : history.length === 0 ? (
          <div className="text-center py-16">
            <HistoryIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary">Your watch history will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {history.map((h) => (
              <div key={`${h.tmdb_id}-${h.season || ''}-${h.episode || ''}`} className="relative group">
                <PosterCard
                  tmdb_id={h.tmdb_id}
                  title={h.title}
                  type={h.type}
                  poster_url={h.poster_url}
                  provider={h.provider}
                  progress={{ position_seconds: h.position_seconds, duration_seconds: h.duration_seconds }}
                  watched_at={h.watched_at}
                  episode_info={h.season ? { season: h.season, episode: h.episode || 0 } : undefined}
                />
                <button
                  onClick={(e) => { e.preventDefault(); removeOne(h.tmdb_id); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-accent"
                  aria-label="Remove from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear all history?">
        <p className="text-text-secondary mb-6">
          This will permanently remove all {history.length} titles from your watch history. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setConfirmClear(false)}
            className="px-4 py-2 rounded-btn bg-surface hover:bg-surface-elevated"
          >
            Cancel
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 rounded-btn bg-accent hover:bg-accent-hover text-white font-medium"
          >
            Clear All
          </button>
        </div>
      </Modal>
    </div>
  );
}
