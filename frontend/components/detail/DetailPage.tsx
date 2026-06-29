// frontend/components/detail/DetailPage.tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { streamhub, DetailResult, Episode } from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';
import { Play, Heart, Download, Star, ChevronLeft, Calendar, Clock, Film, Youtube, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatRuntime, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DetailPageProps {
  type: 'movie' | 'show';
}

export function DetailPage({ type }: DetailPageProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const provider = searchParams.get('provider') || 'tmdb';

  const [detail, setDetail] = useState<DetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<NonNullable<DetailResult['seasons']>>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [streamModalOpen, setStreamModalOpen] = useState(false);
  const [availableStreams, setAvailableStreams] = useState<any[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);

  const setPlayer = usePlayerStore((s) => s.setPlayer);

  useEffect(() => {
    setLoading(true);
    streamhub.details(provider, id, type)
      .then((d) => {
        setDetail(d);
        if (d.seasons && d.seasons.length > 0) {
          setSeasons(d.seasons);
          setSelectedSeason(d.seasons[0].number);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [provider, id, type]);

  useEffect(() => {
    if (type !== 'show' || !detail) return;
    setEpisodesLoading(true);
    streamhub.episodes(provider, id, selectedSeason)
      .then((data) => setEpisodes(data.episodes))
      .catch(() => setEpisodes([]))
      .finally(() => setEpisodesLoading(false));
  }, [provider, id, selectedSeason, type, detail]);

  const toggleFavorite = async () => {
    if (!detail) return;
    if (detail.favorite) {
      await streamhub.favorites.remove(detail.tmdb_id);
      setDetail({ ...detail, favorite: false });
    } else {
      await streamhub.favorites.add({
        tmdb_id: detail.tmdb_id,
        provider: detail.provider,
        provider_id: detail.id,
        title: detail.title,
        type: detail.type,
        poster_url: detail.poster_url,
        year: detail.year,
        rating: detail.rating,
      });
      setDetail({ ...detail, favorite: true });
    }
  };

  const openStreamSelector = async (episode?: number) => {
    if (!detail) return;
    setStreamModalOpen(true);
    setStreamsLoading(true);
    try {
      const data = await streamhub.stream(provider, id, type === 'show' ? selectedSeason : undefined, episode);
      setAvailableStreams(data.streams);
    } catch (e) {
      setAvailableStreams([]);
    } finally {
      setStreamsLoading(false);
    }
  };

  const playStream = (stream: any, episode?: number) => {
    if (!detail) return;
    setPlayer({
      streamUrl: stream.url,
      streamFormat: stream.format,
      title: detail.title,
      episodeTitle: type === 'show' && episode !== undefined ? `S${selectedSeason} · E${episode}` : undefined,
      posterUrl: detail.poster_url,
      tmdb_id: detail.tmdb_id,
      provider: detail.provider,
      provider_id: detail.id,
      type: detail.type,
      season: type === 'show' ? selectedSeason : undefined,
      episode: type === 'show' ? episode : undefined,
      startPosition: detail.history?.position_seconds || 0,
      duration: detail.history?.duration_seconds,
      availableStreams: availableStreams,
    });
    setStreamModalOpen(false);
    router.push('/player');
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <Spinner size={36} />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="pt-20 px-4 text-center">
        <p className="text-warning">{error || 'Not found'}</p>
        <Link href="/" className="text-accent mt-4 inline-block">Back to home</Link>
      </div>
    );
  }

  const resumePosition = detail.history?.position_seconds || 0;
  const hasResume = resumePosition > 30;

  return (
    <div className="pt-0 min-h-screen">
      {/* Backdrop */}
      <div className="relative h-[40vh] md:h-[55vh] w-full overflow-hidden">
        {detail.backdrop_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.backdrop_url}
            alt={detail.title}
            className="absolute inset-0 w-full h-full object-cover blur-sm scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated to-surface" />
        )}
        <div className="absolute inset-0 hero-gradient" />
        <Link
          href="/"
          className="absolute top-20 left-4 md:left-8 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-btn text-sm hover:bg-black/70 transition-colors z-10"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-32 md:-mt-48 px-4 md:px-8 pb-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Poster */}
          <div className="w-32 md:w-56 flex-shrink-0 mx-auto md:mx-0 -mt-20 md:-mt-32">
            {detail.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.poster_url}
                alt={detail.title}
                className="w-full rounded-card shadow-card"
              />
            ) : (
              <div className="w-full aspect-poster rounded-card bg-surface flex items-center justify-center">
                <Film className="w-12 h-12 text-text-muted" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 mt-4 md:mt-0">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3">{detail.title}</h1>

            <div className="flex items-center flex-wrap gap-3 text-sm text-text-secondary mb-4">
              {detail.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> {detail.year}
                </span>
              )}
              {detail.runtime_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {formatRuntime(detail.runtime_minutes)}
                </span>
              )}
              {detail.rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-warning text-warning" /> {detail.rating.toFixed(1)}
                </span>
              )}
              <Badge variant="outline" className="uppercase">{detail.type}</Badge>
              {detail.genres?.map((g) => (
                <Badge key={g} variant="default">{g}</Badge>
              ))}
            </div>

            {detail.tagline && (
              <p className="text-text-secondary italic mb-3">"{detail.tagline}"</p>
            )}

            <p className="text-text-secondary mb-6 max-w-3xl">{detail.overview}</p>

            {/* Action buttons */}
            <div className="flex items-center flex-wrap gap-3 mb-6">
              <button
                onClick={() => type === 'movie' ? openStreamSelector() : (episodes.length > 0 ? openStreamSelector(1) : openStreamSelector())}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover px-6 py-3 rounded-btn font-semibold transition-colors"
              >
                <Play className="w-5 h-5 fill-white" />
                {hasResume ? `Resume · ${Math.floor(resumePosition / 60)}:${String(Math.floor(resumePosition % 60)).padStart(2, '0')}` : 'Play'}
              </button>
              <button
                onClick={toggleFavorite}
                className={`flex items-center gap-2 px-4 py-3 rounded-btn font-medium transition-colors border ${
                  detail.favorite
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'bg-surface border-border text-text-primary hover:bg-surface-elevated'
                }`}
              >
                <Heart className={`w-5 h-5 ${detail.favorite ? 'fill-accent' : ''}`} />
                {detail.favorite ? 'Favorited' : 'Favorite'}
              </button>
              {detail.trailer_url && (
                <a
                  href={detail.trailer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-surface border border-border px-4 py-3 rounded-btn font-medium hover:bg-surface-elevated transition-colors"
                >
                  <Youtube className="w-5 h-5 text-accent" /> Trailer
                </a>
              )}
              <button
                disabled
                className="flex items-center gap-2 bg-surface/50 border border-border px-4 py-3 rounded-btn font-medium text-text-muted cursor-not-allowed"
                title="Downloads coming soon"
              >
                <Download className="w-5 h-5" /> Download
              </button>
            </div>

            {/* Cast */}
            {detail.cast && detail.cast.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-text-secondary uppercase mb-3">Cast</h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {detail.cast.map((c) => (
                    <div key={c.name} className="flex-shrink-0 w-20 text-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-surface mb-2">
                        {c.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl text-text-muted">
                            {c.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-text-primary line-clamp-1">{c.name}</p>
                      <p className="text-[10px] text-text-muted line-clamp-1">{c.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.director && (
              <p className="text-sm text-text-secondary mb-2">
                <span className="text-text-muted">Director:</span> {detail.director}
              </p>
            )}
          </div>
        </div>

        {/* Seasons & Episodes for shows */}
        {type === 'show' && (seasons?.length ?? 0) > 0 && (
          <div className="max-w-7xl mx-auto mt-12">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
              {seasons.map((s) => (
                <button
                  key={s.number}
                  onClick={() => setSelectedSeason(s.number)}
                  className={`px-4 py-2 rounded-btn text-sm font-semibold whitespace-nowrap transition-colors ${
                    selectedSeason === s.number
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-secondary hover:bg-surface-elevated'
                  }`}
                >
                  Season {s.number}
                </button>
              ))}
            </div>

            {episodesLoading ? (
              <div className="text-center py-8"><Spinner size={28} /></div>
            ) : (
              <div className="space-y-3">
                {episodes.map((ep) => (
                  <div
                    key={ep.number}
                    className="flex gap-4 p-3 bg-surface rounded-card hover:bg-surface-elevated transition-colors group cursor-pointer"
                    onClick={() => openStreamSelector(ep.number)}
                  >
                    <div className="w-32 md:w-40 aspect-video flex-shrink-0 bg-surface-elevated rounded-card overflow-hidden relative">
                      {ep.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ep.thumbnail_url} alt={ep.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                          S{selectedSeason}·E{ep.number}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold line-clamp-1">
                          <span className="text-accent">{ep.number}.</span> {ep.title}
                        </h3>
                        {ep.runtime_minutes && (
                          <span className="text-xs text-text-muted whitespace-nowrap">{formatRuntime(ep.runtime_minutes)}</span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-2">{ep.overview || 'No description available.'}</p>
                      {ep.air_date && (
                        <p className="text-xs text-text-muted mt-1">{formatDate(ep.air_date)}</p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors flex-shrink-0 mt-2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stream selector modal */}
      <Modal
        open={streamModalOpen}
        onClose={() => setStreamModalOpen(false)}
        title="Select Stream Source"
      >
        {streamsLoading ? (
          <div className="text-center py-8"><Spinner size={28} /></div>
        ) : availableStreams.length === 0 ? (
          <p className="text-text-secondary text-center py-8">No streams available for this title.</p>
        ) : (
          <div className="space-y-2">
            {availableStreams.map((stream, i) => (
              <button
                key={i}
                onClick={() => playStream(stream, type === 'show' ? 1 : undefined)}
                className="w-full flex items-center justify-between p-3 bg-surface-elevated hover:bg-border rounded-btn transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Play className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium">{stream.label}</p>
                    <p className="text-xs text-text-muted">{stream.format.toUpperCase()} · {stream.quality}</p>
                  </div>
                </div>
                <Badge variant="outline">{stream.quality}</Badge>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
