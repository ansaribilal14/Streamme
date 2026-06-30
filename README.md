# StreamHub — Personal Self-Hosted Streaming PWA

> **Spec source:** [`Stteamhub.md`](./Stteamhub.md) — full implementation-ready spec.

StreamHub is a personal, self-hosted video streaming Progressive Web App that runs CloudStream-compatible providers behind a clean HTTP API. It is built strictly per the master build document: three services (Next.js PWA + Fastify API gateway + CS3 bridge), SQLite storage, TMDB metadata enrichment, OpenSubtitles/SubDL fallback, PIN-protected admin panel, and Docker Compose orchestration.

## Quick Start

### Option A — Docker (local dev)

```bash
git clone https://github.com/ansaribilal14/Streamme.git
cd Streamme
cp .env.example .env       # fill in TMDB / OpenSubtitles keys (optional)
docker compose -f docker-compose.dev.yml up -d --build
```

Open `http://localhost:3000` (or `http://YOUR_SERVER_IP:3000`).
Set the admin PIN on first visit to `/admin`.

### Option B — Production on Oracle Cloud / VPS (recommended)

One-shot deploy on a fresh Ubuntu 22.04 / 24.04 VM:

```bash
ssh ubuntu@<your-vm-public-ip>

# Option 1: one-shot curl pipe
curl -fsSL https://raw.githubusercontent.com/ansaribilal14/Streamme/main/deploy/oracle-deploy.sh | bash

# Option 2: clone first, then run
git clone https://github.com/ansaribilal14/Streamme.git
cd Streamme
bash deploy/oracle-deploy.sh
```

The script installs Docker, opens the firewall, builds all 3 services, and starts Nginx on ports 80/443. Full step-by-step guide in [`deploy/README.md`](./deploy/README.md).

### Option C — Run each service directly (dev mode, no Docker)

```bash
# Terminal 1 — CS3 Bridge (port 5000)
cd cs3-bridge && npm install && PORT=5000 npm start

# Terminal 2 — Backend API (port 4000)
cd backend && npm install && DB_PATH=../database/streamhub.db CS3_BRIDGE_URL=http://localhost:5000 npx tsx src/server.ts

# Terminal 3 — Frontend PWA (port 3000)
cd frontend && npm install && NEXT_PUBLIC_API_URL=http://localhost:4000/api npm run dev
```

Open `http://localhost:3000`.

## Architecture

```
┌──────────────────────────────────────────┐
│         Browser / PWA (port 3000)        │
│       Next.js 14 + React 18 + TW         │
└─────────────────────┬────────────────────┘
                      │ /api/*
┌─────────────────────▼────────────────────┐
│       Fastify API Gateway (port 4000)    │
│   - Routes / search / details / stream   │
│   - SQLite (history, favs, providers)    │
│   - TMDB / OMDb / OpenSubtitles / SubDL  │
└──────┬───────────────────────────────┬───┘
       │                               │
┌──────▼─────────────────┐    ┌────────▼─────────┐
│  CS3 Bridge (port 5000)│    │   TMDB / OS /    │
│  - 6 built-in provider │    │   SubDL APIs     │
│    adapters (CS3 API)  │    └──────────────────┘
│  - .cs3 marker scan    │
└────────────────────────┘
```

## Features

### Frontend (Netflix-like PWA)
- **Home screen** with auto-cycling hero, Continue Watching, Trending Movies/Shows, Recently Added, Favorites rows.
- **Search** — debounced, multi-provider, TMDB-enriched, type + genre filters.
- **Movie/Show detail pages** — backdrop, poster, cast row, trailer button, resume indicator, favorite toggle, stream-source selector modal.
- **TV shows** — season tabs + episode list with thumbnails.
- **Player** — Video.js + HLS.js, custom controls, subtitle selector, quality switcher, speed control, PiP, fullscreen, auto-save position every 10s.
- **History page** with progress bars + clear-all.
- **Favorites page** with sort (recent / A-Z / rating).
- **Admin panel** — PIN protected, providers manager, live logs, cache stats, settings (API keys, theme, default quality, language).
- **PWA** — installable, manifest, maskable icons, offline shell (coming via Workbox).
- **Themes** — Dark, AMOLED Black, Dark Navy.
- **Responsive** — iPad primary, mobile bottom nav, desktop sidebar.

### Backend (Fastify)
- `/api/home` — aggregated home feed.
- `/api/search` — parallel provider search + TMDB enrichment + dedup.
- `/api/details/:provider/:id` — merged provider + TMDB metadata, history + favorite flags.
- `/api/episodes/:provider/:id?season=N` — bridge call with TMDB season fallback.
- `/api/stream/:provider/:id` — bridge call with demo stream fallback so UI always works.
- `/api/subtitles` — OpenSubtitles → SubDL → fallback stub, 7-day cache.
- `/api/history`, `/api/favorites` — full CRUD.
- `/api/admin/*` — provider management, logs, cache, settings, health; PIN protected.

### CS3 Bridge (CloudStream-compatible)
Implements the same HTTP contract as the Kotlin/Ktor bridge from the spec — `/providers`, `/search`, `/details/:p/:id`, `/episodes/:p/:id?season=N`, `/streams/:p/:id?season=N&episode=N`, `/reload`.

Six provider adapters ship by default (VegaMovies, HDHub4u, MoviesDrive, Bollyflix, CastleTV, plus a built-in StreamHub demo provider that always responds so the UI is functional out of the box). A real `.cs3` JVM loader can be slotted in behind the same interface later — just add a new adapter that calls out to a JVM subprocess.

The bridge scans `cs3-bridge/extensions/` for `.cs3` marker files and registers them as providers so the admin panel always shows the correct list.

## Database Schema (SQLite)

Tables: `history`, `favorites`, `providers`, `subtitle_cache`, `metadata_cache`, `settings`.
See `backend/src/db/database.ts` for the full DDL (matches §5 of the spec).

## Provider System

To add a new provider:

1. Drop the `.cs3` file into `cs3-bridge/extensions/`.
2. Click **Update All** in the Admin → Providers tab (or `POST /api/admin/providers/update`).
3. The provider appears in the providers list and is immediately searchable.

To install a provider by metadata (no .cs3 yet): Admin → Add Provider, fill in name/filename/repo URL.

## API Keys (optional but recommended)

Set these in the Admin → Settings tab or via `.env`:

| Key | Service | Purpose |
|---|---|---|
| `TMDB_API_KEY` | TMDB | Posters, ratings, cast, trailers, trending. **Without this, the home feed falls back to the bridge's built-in catalog.** |
| `OMDB_API_KEY` | OMDb | Fallback metadata (not currently wired, reserved). |
| `OPENSUBTITLES_API_KEY` | OpenSubtitles v1 | Subtitle search. |
| `SUBDL_API_KEY` | SubDL | Subtitle fallback. |

Without any keys, the app still works — providers return their built-in catalog and subtitles fall back to a stub VTT track.

## Admin PIN

On first visit to `/admin`, you'll be prompted to set a 4-8 digit PIN. The PIN is bcrypt-hashed and stored in the `settings` table. All `/api/admin/*` routes require the `X-Admin-PIN` header. The frontend stores the PIN in `sessionStorage` only (cleared on tab close).

## Security Notes

- This is a **personal self-hosted app**. No public release, no accounts, no ads.
- CORS is permissive on the backend (intended — same machine / LAN use).
- In production behind Nginx, restrict `/api/admin/` to LAN IPs (rules in `nginx/nginx.conf`, currently commented out — uncomment for production).
- HTTPS via Certbot + Nginx is recommended for production.

## Build the Android APK

The PWA can be packaged as a TWA (Trusted Web Activity) APK using Bubblewrap, or wrapped natively with Capacitor. See `scripts/build-apk.sh` for the automated Capacitor pipeline (downloads JDK + Android SDK on first run).

```bash
scripts/build-apk.sh
# Output: download/streamhub.apk
```

## Project Layout

```
streamhub/
├── frontend/          # Next.js 14 PWA
├── backend/           # Fastify API gateway
├── cs3-bridge/        # CloudStream-compatible provider bridge
├── database/          # SQLite file (gitignored)
├── nginx/             # Reverse proxy config
├── scripts/           # Build / start / setup scripts
├── docker-compose.yml
└── README.md
```

## License

Personal use. Built per the StreamHub master build document (v1.0).

— *Built with care for personal streaming.*
