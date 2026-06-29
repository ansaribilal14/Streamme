// frontend/components/player/VideoPlayer.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Subtitles, Settings, ArrowLeft, Rewind, FastForward, PictureInPicture2 } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { streamhub } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import Link from 'next/link';

interface StreamSource {
  url: string;
  quality: string;
  format: string;
  label: string;
  subtitles?: { url: string; language: string; label: string }[];
}

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [qualities, setQualities] = useState<StreamSource[]>([]);
  const [currentQuality, setCurrentQuality] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState(-1);

  const player = usePlayerStore();

  // Initialize Video.js
  useEffect(() => {
    if (!videoRef.current || !player.streamUrl) return;

    const videoEl = videoRef.current;
    const vjsPlayer = videojs(videoEl, {
      controls: false,
      autoplay: true,
      preload: 'auto',
      fluid: false,
      fill: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      html5: {
        vhs: { withCredentials: false },
      },
    });
    playerRef.current = vjsPlayer;

    // If HLS stream and browser doesn't natively support it, use hls.js
    if (player.streamFormat === 'hls' && videoEl.canPlayType('application/vnd.apple.mpegurl') === '') {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(player.streamUrl);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (player.startPosition > 0) {
            videoEl.currentTime = player.startPosition;
          }
          videoEl.play().catch(() => {});
        });
      }
    } else {
      vjsPlayer.src(player.streamUrl);
      vjsPlayer.one('loadedmetadata', () => {
        if (player.startPosition > 0) vjsPlayer.currentTime(player.startPosition);
      });
    }

    // Wire up events
    vjsPlayer.on('play', () => setPlaying(true));
    vjsPlayer.on('pause', () => setPlaying(false));
    vjsPlayer.on('timeupdate', () => setCurrent(vjsPlayer.currentTime() || 0));
    vjsPlayer.on('durationchange', () => setDuration(vjsPlayer.duration() || 0));
    vjsPlayer.on('volumechange', () => {
      setMuted(!!vjsPlayer.muted());
      setVolume(vjsPlayer.volume() ?? 1);
    });
    vjsPlayer.on('progress', () => {
      const buf = vjsPlayer.buffered();
      if (buf.length > 0) setBuffered(buf.end(buf.length - 1));
    });
    vjsPlayer.on('ratechange', () => setPlaybackRate(vjsPlayer.playbackRate() ?? 1));

    // Load subtitle tracks
    if (player.availableStreams[currentQuality]?.subtitles?.length) {
      const subs = player.availableStreams[currentQuality].subtitles;
      setSubtitleTracks(subs);
      // Add as native text tracks
      subs.forEach((s, i) => {
        vjsPlayer.addRemoteTextTrack({
          src: s.url,
          kind: 'subtitles',
          srclang: s.language,
          label: s.label,
        }, false);
      });
    }

    // Periodic save position
    saveIntervalRef.current = setInterval(() => {
      if ((vjsPlayer.currentTime() ?? 0) > 0 && player.tmdb_id) {
        streamhub.history.upsert({
          tmdb_id: player.tmdb_id,
          provider: player.provider,
          provider_id: player.provider_id,
          title: player.title,
          type: player.type,
          poster_url: player.posterUrl,
          season: player.season,
          episode: player.episode,
          position_seconds: vjsPlayer.currentTime() ?? 0,
          duration_seconds: vjsPlayer.duration(),
        }).catch(() => {});
      }
    }, 10000);

    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      // Save final position
      if ((vjsPlayer.currentTime() ?? 0) > 0 && player.tmdb_id) {
        streamhub.history.upsert({
          tmdb_id: player.tmdb_id,
          provider: player.provider,
          provider_id: player.provider_id,
          title: player.title,
          type: player.type,
          poster_url: player.posterUrl,
          season: player.season,
          episode: player.episode,
          position_seconds: vjsPlayer.currentTime(),
          duration_seconds: vjsPlayer.duration(),
        }).catch(() => {});
      }
      vjsPlayer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.streamUrl]);

  // Auto-hide controls
  useEffect(() => {
    if (!controlsVisible) return;
    const t = setTimeout(() => {
      if (playing) setControlsVisible(false);
    }, 3000);
    return () => clearTimeout(t);
  }, [controlsVisible, playing, current]);

  // Fullscreen tracking
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!playerRef.current) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          playing ? playerRef.current.pause() : playerRef.current.play();
          break;
        case 'ArrowLeft':
          playerRef.current.currentTime(playerRef.current.currentTime() - 15);
          break;
        case 'ArrowRight':
          playerRef.current.currentTime(playerRef.current.currentTime() + 15);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          playerRef.current.muted(!playerRef.current.muted());
          break;
      }
      setControlsVisible(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    playing ? playerRef.current.pause() : playerRef.current.play();
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    playerRef.current.muted(!playerRef.current.muted());
  };

  const seek = (seconds: number) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime(playerRef.current.currentTime() + seconds);
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    playerRef.current.currentTime(pct * (playerRef.current.duration() || 0));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {}
  };

  const changeRate = (rate: number) => {
    playerRef.current?.playbackRate(rate);
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const changeQuality = (idx: number) => {
    setCurrentQuality(idx);
    // Reload stream at new URL
    if (playerRef.current && player.availableStreams[idx]) {
      const currentTime = playerRef.current.currentTime();
      const wasPlaying = !playerRef.current.paused();
      playerRef.current.src(player.availableStreams[idx].url);
      playerRef.current.one('loadedmetadata', () => {
        playerRef.current.currentTime(currentTime);
        if (wasPlaying) playerRef.current.play();
      });
    }
    setShowSettings(false);
  };

  const toggleSubtitle = (idx: number) => {
    if (!playerRef.current) return;
    const tracks = playerRef.current.textTracks();
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === idx ? 'showing' : 'disabled';
    }
    setActiveSubtitle(idx);
    setShowSubtitles(false);
  };

  if (!player.streamUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-text-secondary mb-4">No stream loaded.</p>
        <Link href="/" className="text-accent">Back to home</Link>
      </div>
    );
  }

  const progressPct = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center group"
      onMouseMove={() => setControlsVisible(true)}
      onClick={() => setControlsVisible(true)}
    >
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered w-full h-full"
        playsInline
        crossOrigin="anonymous"
      />

      {/* Click-to-play overlay (when controls hidden) */}
      {!controlsVisible && (
        <button
          className="absolute inset-0 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          aria-label="Play/Pause"
        >
          {playing ? null : (
            <div className="w-20 h-20 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <Play className="w-10 h-10 text-white fill-white ml-1" />
            </div>
          )}
        </button>
      )}

      {/* Top bar */}
      <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white hover:text-accent transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="font-medium">Back</span>
          </Link>
          <div className="text-center">
            <h1 className="text-white font-semibold text-sm md:text-base line-clamp-1">{player.title}</h1>
            {player.episodeTitle && (
              <p className="text-text-secondary text-xs">{player.episodeTitle}</p>
            )}
          </div>
          <div className="w-20" />
        </div>
      </div>

      {/* Center skip buttons */}
      <div className={`absolute inset-0 flex items-center justify-center gap-12 pointer-events-none transition-opacity ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); seek(-15); }}
          className="pointer-events-auto p-3 rounded-full bg-black/50 hover:bg-black/70 text-white"
          aria-label="Back 15s"
        >
          <div className="relative">
            <SkipBack className="w-7 h-7" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-0.5">15</span>
          </div>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="pointer-events-auto p-5 rounded-full bg-white/90 hover:bg-white text-black"
          aria-label="Play/Pause"
        >
          {playing ? <Pause className="w-9 h-9 fill-black" /> : <Play className="w-9 h-9 fill-black ml-0.5" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); seek(15); }}
          className="pointer-events-auto p-3 rounded-full bg-black/50 hover:bg-black/70 text-white"
          aria-label="Forward 15s"
        >
          <div className="relative">
            <SkipForward className="w-7 h-7" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-0.5">15</span>
          </div>
        </button>
      </div>

      {/* Bottom controls */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        {/* Progress bar */}
        <div
          className="relative h-1.5 hover:h-2.5 transition-all bg-white/20 rounded-full cursor-pointer mb-3 group/progress"
          onClick={(e) => { e.stopPropagation(); seekTo(e); }}
        >
          <div
            className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute top-0 left-0 h-full bg-accent rounded-full"
            style={{ width: `${progressPct}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4 text-white">
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="hover:text-accent">
              {playing ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); seek(-10); }} className="hover:text-accent hidden md:block">
              <Rewind className="w-5 h-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); seek(10); }} className="hover:text-accent hidden md:block">
              <FastForward className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 group/vol">
              <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="hover:text-accent">
                {muted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  e.stopPropagation();
                  playerRef.current?.volume(Number(e.target.value));
                  playerRef.current?.muted(false);
                }}
                className="w-0 group-hover/vol:w-20 transition-all accent-accent"
              />
            </div>
            <span className="text-sm font-mono">
              {formatTime(current)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-3 text-white relative">
            {/* Subtitles */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSubtitles(!showSubtitles); setShowSettings(false); }}
                className={`hover:text-accent ${activeSubtitle >= 0 ? 'text-accent' : ''}`}
              >
                <Subtitles className="w-5 h-5" />
              </button>
              {showSubtitles && (
                <div className="absolute bottom-12 right-0 w-48 bg-surface border border-border rounded-modal shadow-modal overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleSubtitle(-1)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-elevated ${activeSubtitle === -1 ? 'text-accent' : ''}`}
                  >
                    Off
                  </button>
                  {subtitleTracks.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => toggleSubtitle(i)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-elevated ${activeSubtitle === i ? 'text-accent' : ''}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings (quality + speed) */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setShowSubtitles(false); }}
                className="hover:text-accent"
              >
                <Settings className="w-5 h-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-12 right-0 w-56 bg-surface border border-border rounded-modal shadow-modal overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="px-4 py-2 border-b border-border text-xs text-text-muted uppercase">Quality</div>
                  {player.availableStreams.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => changeQuality(i)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-elevated ${currentQuality === i ? 'text-accent' : ''}`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <div className="px-4 py-2 border-t border-border text-xs text-text-muted uppercase">Speed</div>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <button
                      key={r}
                      onClick={() => changeRate(r)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-elevated ${playbackRate === r ? 'text-accent' : ''}`}
                    >
                      {r === 1 ? 'Normal' : `${r}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={(e) => { e.stopPropagation(); togglePiP(); }} className="hover:text-accent hidden md:block">
              <PictureInPicture2 className="w-5 h-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="hover:text-accent">
              {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
