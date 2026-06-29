// frontend/components/home/PosterCard.tsx
'use client';
import Link from 'next/link';
import { Star, Play } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatRelative } from '@/lib/utils';

interface PosterCardProps {
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
  size?: 'sm' | 'md' | 'lg';
}

export function PosterCard({
  tmdb_id, title, type, year, poster_url, rating, provider, progress, watched_at, episode_info, size = 'md',
}: PosterCardProps) {
  const widthClass = size === 'sm' ? 'w-28 md:w-32' : size === 'lg' ? 'w-44 md:w-52' : 'w-32 md:w-40';
  const progressPct = progress && progress.duration_seconds
    ? Math.min(100, (progress.position_seconds / progress.duration_seconds) * 100)
    : progress ? Math.min(100, (progress.position_seconds / 5400) * 100) : 0;

  return (
    <Link
      href={`/${type}/${tmdb_id}${provider ? `?provider=${encodeURIComponent(provider)}` : ''}`}
      className={`group ${widthClass} flex-shrink-0 card-hover block`}
    >
      <div className="relative aspect-poster bg-surface rounded-card overflow-hidden">
        {poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster_url}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface text-text-muted">
            <span className="text-xs px-2 text-center">{title}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          {rating ? (
            <span className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-badge text-xs">
              <Star className="w-3 h-3 fill-warning text-warning" />
              {rating.toFixed(1)}
            </span>
          ) : <span />}
          <Badge variant="outline" className="bg-black/70 backdrop-blur-sm uppercase">
            {type}
          </Badge>
        </div>

        {/* Progress bar */}
        {progress && progress.position_seconds > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
            <div className="h-full bg-accent" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      <div className="mt-2">
        <h3 className="text-sm font-medium text-text-primary line-clamp-1">{title}</h3>
        <div className="flex items-center justify-between text-xs text-text-secondary mt-0.5">
          <span>{year || ''}</span>
          {episode_info && (
            <span className="text-accent">S{episode_info.season}·E{episode_info.episode}</span>
          )}
        </div>
        {watched_at && (
          <p className="text-[10px] text-text-muted mt-0.5">{formatRelative(watched_at)}</p>
        )}
        {provider && provider !== 'tmdb' && (
          <p className="text-[10px] text-text-muted mt-0.5 truncate">{provider}</p>
        )}
      </div>
    </Link>
  );
}
