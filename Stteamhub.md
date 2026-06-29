# StreamHub — Master Build Document
### Version 1.0 | Personal Self-Hosted Streaming PWA with CloudStream Extension Support

---

## 0. Purpose of This Document

This document is a complete, implementation-ready specification for **StreamHub** — a personal, self-hosted video streaming web application. It is written to be handed directly to an AI coding assistant (GLM-5 or similar) as a single-source-of-truth prompt. Every architectural decision, UI detail, folder structure, API contract, database schema, provider system, and phased build plan is defined here. The assistant should build exactly what is described, in the order described, with no assumptions left open.

---

## 1. Project Overview

**Name:** StreamHub  
**Type:** Self-hosted Progressive Web App (PWA)  
**Target Devices:** iPad (primary), Android, Windows, Mac — all via browser  
**Purpose:** Personal use only. No public release. No accounts. No ads.  

### Core Goal

Run real CloudStream extensions (`.cs3` files) on a web browser via a Kotlin bridge service, so the user gets access to the full CloudStream extension ecosystem without any native app. The frontend is a beautiful Netflix-like PWA. The backend orchestrates providers, metadata, subtitles, history, and favorites.

### What Makes This Different From Just Cloning CloudStream

- CloudStream is a native Android Kotlin app. This project runs everything in the browser.
- CloudStream extensions are Kotlin/JVM bytecode. This project runs them server-side via a Kotlin bridge microservice, then exposes a clean HTTP API to the frontend.
- The user never touches Kotlin. They just drop `.cs3` files into a folder and the system handles the rest.

---

## 2. Tech Stack

### Frontend
| Tech | Version | Purpose |
|---|---|---|
| Next.js | 15 | App framework, routing, SSR |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Framer Motion | latest | Animations |
| Video.js | 8.x | Video player |
| HLS.js | latest | HLS stream playback |
| Workbox / next-pwa | latest | PWA service worker |
| Dexie.js | latest | IndexedDB wrapper (offline history) |
| SWR | latest | Data fetching and caching |
| Zustand | latest | Global state management |

### Backend (API Gateway)
| Tech | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Fastify | 4.x | HTTP server (faster than Express) |
| TypeScript | 5.x | Type safety |
| better-sqlite3 | latest | SQLite bindings |
| node-fetch | latest | HTTP calls to Kotlin bridge |
| zod | latest | Schema validation |
| pino | latest | Structured logging |

### CS3 Bridge (CloudStream Extension Runner)
| Tech | Version | Purpose |
|---|---|---|
| Kotlin | 1.9.x | Language |
| Ktor | 2.x | Embedded HTTP server |
| CloudStream-3 libs | latest | Extension loader and runner |
| Gradle | 8.x | Build system |

### Database
| Tech | Purpose |
|---|---|
| SQLite | All persistent storage |

SQLite stores: watch history, favorites, installed providers, subtitle cache, provider metadata.

### External APIs
| Service | Purpose |
|---|---|
| TMDB API | Movie/show metadata, posters, ratings |
| OMDb API | Fallback metadata |
| OpenSubtitles API | Automatic subtitle search |
| SubDL API | Fallback subtitle source |

### Infrastructure
| Tech | Purpose |
|---|---|
| Docker | Containerization |
| Docker Compose | Multi-service orchestration |
| Oracle Cloud VM (or any Linux VPS) | Hosting |
| Nginx | Reverse proxy |
| Certbot | SSL |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              iPad / Browser (PWA)                    │
│         Next.js 15 Frontend (Port 3000)              │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼───────────────────────────────┐
│          Node.js / Fastify API Gateway               │
│                   (Port 4000)                        │
│  - Routes requests                                   │
│  - Queries SQLite                                    │
│  - Calls TMDB/OMDb for metadata                      │
│  - Calls OpenSubtitles/SubDL                         │
│  - Calls CS3 Bridge for stream data                  │
└──────┬──────────────────────────────────────────────┘
       │ HTTP (internal)
┌──────▼──────────────────────────────────────────────┐
│         Kotlin CS3 Bridge (Port 5000)                │
│  - Loads .cs3 extension files from /extensions/      │
│  - Runs search(), details(), episodes(), streams()   │
│  - Returns JSON to Node backend                      │
│  - Uses CloudStream's own extension loader           │
└─────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│          .cs3 Extension Files                        │
│  /extensions/                                        │
│    vegamovies.cs3                                    │
│    hdhub4u.cs3                                       │
│    moviesdrive.cs3                                   │
│    bollyflix.cs3                                     │
│    castletv.cs3                                      │
└─────────────────────────────────────────────────────┘
```

All three services run in Docker. Docker Compose starts everything with one command.

---

## 4. Folder Structure

```
streamhub/
├── frontend/                          # Next.js 15 PWA
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Home screen
│   │   ├── search/
│   │   │   └── page.tsx
│   │   ├── movie/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── show/
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── season/
│   │   │           └── [season]/
│   │   │               └── page.tsx
│   │   ├── player/
│   │   │   └── page.tsx
│   │   ├── history/
│   │   │   └── page.tsx
│   │   ├── favorites/
│   │   │   └── page.tsx
│   │   ├── downloads/
│   │   │   └── page.tsx
│   │   └── admin/
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Spinner.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── BottomNav.tsx          # Mobile/iPad nav
│   │   ├── home/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── PosterGrid.tsx
│   │   │   ├── ContinueWatching.tsx
│   │   │   ├── TrendingRow.tsx
│   │   │   └── FavoritesRow.tsx
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   └── SearchResults.tsx
│   │   ├── detail/
│   │   │   ├── MovieDetail.tsx
│   │   │   ├── ShowDetail.tsx
│   │   │   ├── SeasonSelector.tsx
│   │   │   └── EpisodeList.tsx
│   │   ├── player/
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── PlayerControls.tsx
│   │   │   ├── SubtitleSelector.tsx
│   │   │   ├── QualitySelector.tsx
│   │   │   └── StreamSourceSelector.tsx
│   │   └── admin/
│   │       ├── ProviderManager.tsx
│   │       ├── LogViewer.tsx
│   │       └── CacheManager.tsx
│   ├── hooks/
│   │   ├── usePlayer.ts
│   │   ├── useHistory.ts
│   │   ├── useFavorites.ts
│   │   ├── useSearch.ts
│   │   └── useProviders.ts
│   ├── lib/
│   │   ├── api.ts                     # API client (calls backend)
│   │   ├── db.ts                      # Dexie.js IndexedDB setup
│   │   ├── tmdb.ts                    # TMDB helper
│   │   └── utils.ts
│   ├── store/
│   │   ├── playerStore.ts             # Zustand player state
│   │   └── appStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── public/
│   │   ├── manifest.json              # PWA manifest
│   │   ├── sw.js                      # Service worker
│   │   └── icons/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                           # Node.js + Fastify API
│   ├── src/
│   │   ├── server.ts                  # Entry point
│   │   ├── routes/
│   │   │   ├── search.ts
│   │   │   ├── details.ts
│   │   │   ├── episodes.ts
│   │   │   ├── stream.ts
│   │   │   ├── subtitles.ts
│   │   │   ├── history.ts
│   │   │   ├── favorites.ts
│   │   │   └── admin.ts
│   │   ├── services/
│   │   │   ├── cs3Bridge.ts           # Talks to Kotlin bridge
│   │   │   ├── tmdb.ts               # TMDB metadata
│   │   │   ├── subtitles.ts          # OpenSubtitles + SubDL
│   │   │   └── cache.ts              # In-memory + SQLite cache
│   │   ├── db/
│   │   │   ├── database.ts           # SQLite init + migrations
│   │   │   ├── history.ts
│   │   │   ├── favorites.ts
│   │   │   └── providers.ts
│   │   ├── middleware/
│   │   │   ├── cors.ts
│   │   │   ├── auth.ts               # PIN check for admin routes
│   │   │   └── logger.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── cs3-bridge/                        # Kotlin CS3 Extension Runner
│   ├── src/
│   │   └── main/
│   │       └── kotlin/
│   │           ├── Application.kt     # Ktor server entry
│   │           ├── ExtensionLoader.kt # Loads .cs3 files
│   │           ├── BridgeRoutes.kt    # HTTP routes
│   │           └── models/
│   │               └── Models.kt
│   ├── extensions/                    # Drop .cs3 files here
│   ├── build.gradle.kts
│   └── settings.gradle.kts
│
├── database/
│   └── streamhub.db                   # SQLite file
│
├── nginx/
│   ├── nginx.conf
│   └── ssl/
│
├── scripts/
│   ├── setup.sh                       # First-time setup
│   ├── update-providers.sh            # Pull new .cs3 files
│   └── backup.sh
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## 5. Database Schema (SQLite)

```sql
-- Watch History
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('movie','show')),
  poster_url TEXT,
  season INTEGER,
  episode INTEGER,
  episode_title TEXT,
  position_seconds REAL NOT NULL DEFAULT 0,
  duration_seconds REAL,
  watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tmdb_id, season, episode)
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('movie','show')),
  poster_url TEXT,
  year INTEGER,
  rating REAL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Installed Providers (CS3 metadata)
CREATE TABLE IF NOT EXISTS providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  repo_url TEXT,
  installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME
);

-- Subtitle Cache
CREATE TABLE IF NOT EXISTS subtitle_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id TEXT NOT NULL,
  season INTEGER,
  episode INTEGER,
  language TEXT NOT NULL DEFAULT 'en',
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tmdb_id, season, episode, language, source)
);

-- Metadata Cache
CREATE TABLE IF NOT EXISTS metadata_cache (
  tmdb_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

## 6. Backend API Reference (Fastify)

### Base URL: `http://localhost:4000/api`

All responses are JSON. All errors return `{ error: string, code: number }`.

---

### Search

**GET** `/search`

| Param | Type | Required | Description |
|---|---|---|---|
| q | string | yes | Search query |
| providers | string | no | Comma-separated list. Default: all enabled |
| type | string | no | `movie` or `show`. Default: both |

**Response:**
```json
{
  "results": [
    {
      "id": "vegamovies::avengers-2019",
      "provider": "vegamovies",
      "tmdb_id": "299536",
      "title": "Avengers: Infinity War",
      "type": "movie",
      "year": 2018,
      "poster_url": "https://image.tmdb.org/...",
      "rating": 8.4,
      "overview": "..."
    }
  ],
  "providers_searched": ["vegamovies", "hdhub4u", "moviesdrive"],
  "total": 12
}
```

Searches are parallelized across all enabled providers via `Promise.allSettled()`.

---

### Details

**GET** `/details/:provider/:id`

Returns full metadata for a title, merged from provider + TMDB.

**Response (Movie):**
```json
{
  "id": "vegamovies::avengers-2019",
  "provider": "vegamovies",
  "tmdb_id": "299536",
  "title": "Avengers: Infinity War",
  "type": "movie",
  "year": 2018,
  "poster_url": "...",
  "backdrop_url": "...",
  "rating": 8.4,
  "runtime_minutes": 149,
  "genres": ["Action", "Adventure"],
  "overview": "...",
  "cast": [...],
  "director": "...",
  "trailer_url": "..."
}
```

**Response (Show) — additional fields:**
```json
{
  ...
  "seasons": [
    { "number": 1, "episode_count": 9, "air_date": "2019-09-12" }
  ]
}
```

---

### Episodes

**GET** `/episodes/:provider/:id`

| Param | Type | Required |
|---|---|---|
| season | number | yes |

**Response:**
```json
{
  "season": 1,
  "episodes": [
    {
      "number": 1,
      "title": "Odessa",
      "overview": "...",
      "air_date": "2019-09-12",
      "thumbnail_url": "...",
      "runtime_minutes": 54
    }
  ]
}
```

---

### Streams

**GET** `/stream/:provider/:id`

| Param | Type | Required |
|---|---|---|
| season | number | if show |
| episode | number | if show |

**Response:**
```json
{
  "streams": [
    {
      "url": "https://...",
      "quality": "1080p",
      "format": "hls",
      "label": "Server 1 · 1080p",
      "headers": { "Referer": "https://..." },
      "subtitles": [
        { "url": "...", "language": "en", "label": "English" }
      ]
    }
  ]
}
```

---

### Subtitles

**GET** `/subtitles`

| Param | Type | Required |
|---|---|---|
| tmdb_id | string | yes |
| season | number | if show |
| episode | number | if show |
| language | string | no, default `en` |

**Response:**
```json
{
  "subtitles": [
    { "url": "...", "language": "en", "label": "English (SRT)", "source": "opensubtitles" }
  ]
}
```

---

### History

**GET** `/history` — Returns all watched items, ordered by `watched_at` DESC.

**POST** `/history` — Upsert watch position.
```json
{
  "tmdb_id": "299536",
  "provider": "vegamovies",
  "provider_id": "avengers-2019",
  "title": "Avengers: Infinity War",
  "type": "movie",
  "poster_url": "...",
  "position_seconds": 3420,
  "duration_seconds": 8940
}
```

**DELETE** `/history/:tmdb_id` — Remove from history.

**DELETE** `/history` — Clear all history.

---

### Favorites

**GET** `/favorites` — All favorites.

**POST** `/favorites` — Add favorite.

**DELETE** `/favorites/:tmdb_id` — Remove favorite.

---

### Admin Routes (PIN protected)

**GET** `/admin/providers` — List all installed providers with status.

**POST** `/admin/providers/enable/:name` — Enable a provider.

**POST** `/admin/providers/disable/:name` — Disable a provider.

**POST** `/admin/providers/update` — Pull updates from repo URLs and restart bridge.

**GET** `/admin/logs` — Last 500 log lines.

**POST** `/admin/cache/clear` — Clear metadata + subtitle cache.

**GET** `/admin/health` — Health check for all services.

---

## 7. CS3 Bridge API (Kotlin / Ktor)

### Base URL: `http://localhost:5000` (internal only, not exposed to browser)

The Kotlin bridge runs CloudStream extensions inside a JVM sandbox. The Node backend is the only client.

---

**GET** `/providers` — List all loaded extensions.

**GET** `/search?q=avengers&providers=vegamovies,hdhub4u`

**GET** `/details/:provider/:id`

**GET** `/episodes/:provider/:id?season=1`

**GET** `/streams/:provider/:id?season=1&episode=1`

**POST** `/reload` — Reload all extensions from disk (hot reload, no restart needed).

---

### How Extension Loading Works

1. On startup, `ExtensionLoader.kt` scans `/extensions/` for all `.cs3` files.
2. Each `.cs3` file is loaded using CloudStream's `JarLoader` / class loader.
3. The extension's `MainAPI` subclass is instantiated.
4. Routes in `BridgeRoutes.kt` call the extension's methods.
5. Responses are serialized to JSON and returned to the Node backend.

---

## 8. Frontend — Page Specifications

### 8.1 Home Screen

**Route:** `/`

**Layout:**
- Full-screen dark background (`#0A0A0A`)
- Top: Navbar with logo, search icon, notifications icon
- Hero Section: Auto-cycling featured title with backdrop, title, overview, Watch button, More Info button
- Row 1: Continue Watching (horizontal scroll, shows progress bar on poster)
- Row 2: Trending Now (poster grid, horizontal scroll)
- Row 3: Recently Added
- Row 4: Your Favorites
- Bottom: BottomNav bar (iPad/mobile)

**Behavior:**
- On load, fetch trending from TMDB, favorites and continue-watching from local DB.
- All rows lazy-load.
- Posters use skeleton loaders while fetching.
- Clicking any poster navigates to `/movie/[tmdb_id]` or `/show/[tmdb_id]`.

---

### 8.2 Search Page

**Route:** `/search`

**Layout:**
- Full-screen search bar at top (auto-focused on mount)
- Below: Genre filter pills (Action, Comedy, Horror, etc.)
- Results grid: 2–3 column poster grid
- Each result card shows: Poster, Title, Year, Rating badge, Type badge (Movie/Show)

**Behavior:**
- Debounced search (300ms) triggered on input.
- Searches all enabled providers in parallel.
- Results are deduplicated by TMDB ID.
- TMDB metadata enriches every result (poster, rating, year).
- A provider badge on each card shows which source it came from.
- Clicking a result navigates to detail page.

---

### 8.3 Movie Detail Page

**Route:** `/movie/[id]`

**Layout:**
- Full-screen backdrop image (blurred, dark overlay)
- Poster (left, 40% width on iPad)
- Right column:
  - Title (large, bold, white)
  - Year · Runtime · Rating badge · Genres
  - Overview text (2–3 lines, expandable)
  - Buttons row: `▶ Watch` (primary), `❤ Favorite` (toggle), `↓ Download` (optional)
  - Cast row (horizontal scroll, avatar + name)
  - Trailer button (opens YouTube in modal)

**Behavior:**
- On mount: fetch TMDB metadata + check favorites + check history.
- If in history: show resume position on Watch button ("Resume 58:40").
- Favorite button toggles instantly (optimistic update).
- Watch button opens stream source selector modal, then navigates to player.

---

### 8.4 TV Show Detail Page

**Route:** `/show/[id]`

**Layout:** Same as movie detail, plus below:
- Season selector tabs (S1, S2, S3...)
- Episode list for selected season:
  - Thumbnail, Episode number, Title, Air date, Runtime, Overview (collapsed)
  - Progress bar if partially watched
  - "Continue" label if last watched episode

**Behavior:**
- Default selected season = last watched season (or S1).
- Clicking an episode triggers stream source selector, then player.
- Auto-selects next episode after current one finishes.

---

### 8.5 Player Page

**Route:** `/player`

**State passed via:** Zustand store (streamUrl, title, position, tmdb_id, season, episode)

**Layout:**
- True fullscreen (no browser chrome ideally — use Fullscreen API)
- Video fills entire screen
- Controls overlay (auto-hide after 3s):
  - Top bar: Back arrow, Title, Episode title
  - Bottom bar:
    - Progress bar (scrubable, shows loaded buffer)
    - Current time / Duration
    - Play/Pause
    - -15s / +15s skip buttons
    - Subtitle selector
    - Quality selector
    - Speed selector (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
    - Audio track selector
    - PiP button
    - AirPlay button (Safari only)
    - Fullscreen toggle

**Behavior:**
- Player initializes Video.js with HLS.js for `.m3u8` streams.
- Loads subtitles if available (from stream metadata or fetched separately).
- Every 10 seconds, saves position to backend (`POST /history`).
- On unmount: saves final position.
- At 90% of video, shows "Next Episode" card in bottom-right (shows only).
- Orientation: locks to landscape on iPad when in fullscreen.

**Supported Formats:**
- HLS (`.m3u8`)
- MP4 (direct)
- DASH (`.mpd`)

---

### 8.6 History Page

**Route:** `/history`

**Layout:**
- Grid of watched titles
- Each card: Poster, Title, Type, Last watched date, Progress bar
- "Clear All" button (with confirmation)
- Per-item remove button on hover/long-press

---

### 8.7 Favorites Page

**Route:** `/favorites`

**Layout:** Identical to Netflix's "My List".
- Poster grid (3–4 columns on iPad)
- Each card: Poster, Title, Year, Remove button on long-press
- Sort options: Recently Added, A–Z, Rating

---

### 8.8 Admin Panel

**Route:** `/admin`

**Access:** PIN modal on first visit per session. PIN stored in settings table.

**Sections:**

**Providers Tab:**
- Table: Provider name, version, status (enabled/disabled), last updated
- Toggle switch per provider
- "Update All" button
- "Add Provider" button (paste repo JSON URL)

**Logs Tab:**
- Scrollable log output (last 500 lines)
- Filter: error, warn, info
- "Clear Logs" button

**Cache Tab:**
- Show cache stats (metadata count, subtitle count, total size)
- "Clear Metadata Cache" button
- "Clear Subtitle Cache" button
- "Clear All Cache" button

**Settings Tab:**
- Admin PIN change
- TMDB API key input
- OMDb API key input
- OpenSubtitles API key input
- Default subtitle language selector
- Theme selector (Dark, AMOLED Black, Dark Navy)
- Player default quality
- Enable/disable downloads feature

---

## 9. UI Design System

### Colors
```
Background:        #0A0A0A  (main)
Surface:           #141414  (cards, modals)
Surface Elevated:  #1F1F1F  (dropdowns, hover)
Border:            #2A2A2A
Text Primary:      #FFFFFF
Text Secondary:    #A3A3A3
Text Muted:        #525252
Accent:            #E50914  (Netflix red — or user-customizable)
Accent Hover:      #B81D24
Success:           #22C55E
Warning:           #F59E0B
```

### Typography
```
Font Family: Inter (Google Fonts)
Display (Hero title):  48px, weight 800
H1:                    32px, weight 700
H2:                    24px, weight 600
H3:                    18px, weight 600
Body:                  16px, weight 400
Small:                 14px, weight 400
Caption:               12px, weight 400
```

### Spacing
8px base unit. All spacing is multiples of 8: 8, 16, 24, 32, 48, 64.

### Border Radius
Cards: 8px. Modals: 12px. Buttons: 6px. Badges: 4px. Avatars: 50%.

### Shadows
```css
card-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
modal-shadow: 0 8px 48px rgba(0, 0, 0, 0.8);
```

### Poster Aspect Ratio
Movies/Shows: 2:3 (portrait). Backdrops: 16:9.

### Animations
- Page transitions: 200ms fade + slight upward slide
- Card hover: scale(1.04), shadow increase, 150ms ease
- Skeleton loaders: shimmer animation (left-to-right gradient)
- Modal open: scale from 0.95 to 1.0 + fade, 200ms

### Responsive Breakpoints
```
Mobile:  < 768px   (BottomNav, 2-col grid)
Tablet:  768–1279px (iPad — 3-col grid, sidebar hidden, BottomNav)
Desktop: ≥ 1280px  (Sidebar visible, 4–5 col grid)
```

---

## 10. PWA Configuration

### Manifest (`/public/manifest.json`)
```json
{
  "name": "StreamHub",
  "short_name": "StreamHub",
  "description": "Your personal streaming hub",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0A",
  "theme_color": "#0A0A0A",
  "orientation": "any",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker (Workbox)
Cache strategy:
- App shell: Cache First
- API responses: Network First with 30s timeout, fallback to cache
- TMDB images: Cache First, 7-day expiry
- Video streams: Network Only (never cache — too large)

---

## 11. Provider System (CS3 Bridge)

### How to Add a New Provider

1. Download the `.cs3` file from the CloudStream extension repo.
2. Drop it into `cs3-bridge/extensions/`.
3. Call `POST /admin/providers/reload` or click "Reload Providers" in admin panel.
4. The extension appears in the providers list and is immediately searchable.

### Provider Repository Format

A repo is a remote JSON file listing available extensions:

```json
{
  "name": "Main Repo",
  "description": "Official CloudStream extensions",
  "providers": [
    {
      "name": "VegaMovies",
      "version": "1.4",
      "cs3_url": "https://github.com/.../vegamovies.cs3",
      "language": "hi",
      "categories": ["movies", "shows"]
    },
    {
      "name": "HDHub4u",
      "version": "2.1",
      "cs3_url": "https://github.com/.../hdhub4u.cs3",
      "language": "hi",
      "categories": ["movies"]
    }
  ]
}
```

Users can add repo URLs in the Admin Panel. The system fetches the JSON, lists available providers, and lets the user install individual ones.

### Default Providers to Support (in order of priority)
1. VegaMovies
2. HDHub4u
3. MoviesDrive
4. Bollyflix
5. CastleTV
6. (Any further CloudStream-compatible extension)

---

## 12. Subtitle System

### Flow
1. Stream response from CS3 bridge may already include subtitle URLs (embedded in stream metadata).
2. If not, backend auto-searches OpenSubtitles by TMDB ID + language.
3. If OpenSubtitles fails, falls back to SubDL.
4. Results are cached in SQLite for 7 days.
5. Player loads subtitles as VTT tracks via Video.js TextTrack API.

### Supported Formats
SRT (converted to VTT client-side), VTT, ASS/SSA (converted).

### Languages
Display in selector by: English, Hindi, user's preferred language, then alphabetical.

---

## 13. Security

### Admin Panel Protection
- On first launch, user sets a 4–8 digit PIN in the admin panel.
- PIN is hashed with bcrypt and stored in the settings table.
- Admin routes require `X-Admin-PIN` header.
- Frontend stores PIN in sessionStorage only (cleared on tab close).
- No other authentication is implemented. This is a personal, self-hosted app.

### Network
- CORS: Only allow requests from the frontend origin.
- Admin routes: Block from external IPs in Nginx config (only allow localhost or LAN).
- HTTPS: Required in production (Certbot + Nginx).

---

## 14. Docker Configuration

### `docker-compose.yml`
```yaml
version: "3.9"

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000/api
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    volumes:
      - ./database:/app/database
    environment:
      - CS3_BRIDGE_URL=http://cs3bridge:5000
      - TMDB_API_KEY=${TMDB_API_KEY}
      - OMDB_API_KEY=${OMDB_API_KEY}
      - OPENSUBTITLES_API_KEY=${OPENSUBTITLES_API_KEY}
      - DB_PATH=/app/database/streamhub.db
      - ADMIN_PIN_HASH=${ADMIN_PIN_HASH}
    depends_on:
      - cs3bridge

  cs3bridge:
    build: ./cs3-bridge
    ports:
      - "5000:5000"
    volumes:
      - ./cs3-bridge/extensions:/app/extensions

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
```

### `.env` (user creates this, never committed to git)
```
TMDB_API_KEY=your_key_here
OMDB_API_KEY=your_key_here
OPENSUBTITLES_API_KEY=your_key_here
ADMIN_PIN_HASH=bcrypt_hash_of_your_pin
```

### Start Command
```bash
docker compose up -d
```

### Stop Command
```bash
docker compose down
```

---

## 15. Development Phases

---

### Phase 1 — Foundation (Week 1–2)

**Goal:** Everything runs. Nothing is pretty yet.

**Backend tasks:**
- [ ] Fastify server boots on port 4000
- [ ] SQLite initializes with full schema on first boot
- [ ] `/search`, `/details`, `/history`, `/favorites` routes scaffold (return mock data)
- [ ] TMDB service: fetch metadata by ID and by search query
- [ ] Environment variable loading + validation

**CS3 Bridge tasks:**
- [ ] Ktor server boots on port 5000
- [ ] `ExtensionLoader.kt` scans `/extensions/` folder on startup
- [ ] Loads at least one `.cs3` file successfully (VegaMovies)
- [ ] `GET /providers` returns list of loaded extensions
- [ ] `GET /search` proxies to extension's `search()` method and returns JSON

**Frontend tasks:**
- [ ] Next.js 15 project initialized with TypeScript + Tailwind
- [ ] Global layout with Navbar and BottomNav
- [ ] Home page renders (static data, no API yet)
- [ ] PWA manifest and icons in place
- [ ] API client (`lib/api.ts`) connects to backend

**Docker tasks:**
- [ ] All three services dockerized
- [ ] `docker compose up` starts everything successfully

**Deliverable:** App runs end-to-end locally. Search hits VegaMovies via the CS3 bridge and returns real results to the browser.

---

### Phase 2 — Provider Engine (Week 3–4)

**Goal:** All major providers work. Search is unified.

**CS3 Bridge tasks:**
- [ ] Load and run all 5 default providers
- [ ] `search()` fully implemented for all providers
- [ ] `details()` fully implemented
- [ ] `episodes()` fully implemented
- [ ] `streams()` fully implemented (returns stream URLs, quality, format)
- [ ] Error isolation: one provider failing doesn't crash others
- [ ] Hot reload: `POST /reload` reloads extensions without restart

**Backend tasks:**
- [ ] Parallel search across all enabled providers (`Promise.allSettled`)
- [ ] Result deduplication by TMDB ID
- [ ] TMDB metadata merged into every result
- [ ] `/stream/:provider/:id` route proxies to CS3 bridge
- [ ] Stream URL validation before returning to frontend
- [ ] Admin routes: enable/disable providers, reload providers

**Frontend tasks:**
- [ ] Search page fully functional (real results)
- [ ] Movie detail page loads real metadata from backend
- [ ] TV show detail page with season/episode list
- [ ] Stream source selector modal (shows available qualities, lets user pick)

**Deliverable:** User can search for any title, browse results, view details, and select a stream. Video URL is returned to the browser. Player not yet integrated.

---

### Phase 3 — Player and Core Features (Week 5–6)

**Goal:** User can actually watch videos. History and favorites work.

**Frontend tasks:**
- [ ] Video.js initialized with HLS.js plugin
- [ ] Player page renders in fullscreen
- [ ] All player controls: play/pause, seek, skip, speed, fullscreen
- [ ] Progress bar with buffer indicator
- [ ] Subtitle selector: load VTT/SRT subtitles from stream metadata
- [ ] Quality selector: switch between stream sources
- [ ] PiP button (Picture-in-Picture API)
- [ ] AirPlay button (WebKit AirPlay API, Safari only)
- [ ] Auto-save position every 10 seconds
- [ ] "Next Episode" card at 90% completion (for shows)
- [ ] Continue Watching row on home screen (reads from backend history)

**Backend tasks:**
- [ ] `POST /history` saves position correctly (upsert by tmdb_id + season + episode)
- [ ] `GET /history` returns sorted history
- [ ] `POST /favorites` and `GET /favorites` fully implemented
- [ ] Subtitle fetch and cache pipeline complete
- [ ] `/subtitles` route returns merged results from OpenSubtitles + SubDL

**Deliverable:** Full watch-to-finish experience. History is tracked. Favorites work. Continue Watching works.

---

### Phase 4 — Polish and PWA (Week 7–8)

**Goal:** App feels premium. Installable on iPad. Ready for daily use.

**Frontend tasks:**
- [ ] All animations (card hover, page transitions, skeleton loaders)
- [ ] Skeleton loaders on every loading state
- [ ] Error states: provider failed, stream unavailable, no results
- [ ] Home screen: Hero section with auto-cycling featured titles
- [ ] Trending row populated from TMDB trending API
- [ ] Dark/AMOLED/Navy theme switcher
- [ ] PWA: service worker caches app shell and TMDB images
- [ ] PWA: "Add to Home Screen" prompt
- [ ] iPad: landscape layout optimized, BottomNav hides in landscape player
- [ ] Settings page: API key management, subtitle language, player defaults
- [ ] Downloads page (optional): list downloaded content

**Backend tasks:**
- [ ] Metadata cache: store TMDB responses in SQLite, serve from cache for 24h
- [ ] Subtitle cache: serve from SQLite before calling external APIs
- [ ] `/admin/health` endpoint checks all services
- [ ] Logging: pino structured logs, accessible via admin panel

**CS3 Bridge tasks:**
- [ ] Provider repository system: fetch repo JSON, list available extensions
- [ ] Install provider from URL via admin panel
- [ ] Provider version tracking

**Docker + Nginx tasks:**
- [ ] Production Docker Compose with Nginx reverse proxy
- [ ] HTTPS with Certbot
- [ ] Nginx: block admin routes from external IPs

**Deliverable:** Fully polished app. Installable on iPad as PWA. All screens complete. Provider manager in admin panel. Ready for daily personal use.

---

## 16. Coding Standards

### General
- All files: TypeScript strict mode. No `any` types.
- Use `zod` for all external data validation (API responses, request bodies).
- Error handling: every async operation wrapped in try/catch. Errors logged with context.
- No secrets in source code. All secrets via environment variables.
- Comments: only for non-obvious logic. Self-documenting variable and function names.

### Frontend
- Components: functional with hooks. No class components.
- State: local state for UI, Zustand for global, SWR for server state.
- No inline styles. All styling via Tailwind classes.
- Images: always use `next/image` with explicit width/height.
- Routing: use Next.js App Router. No Pages Router.

### Backend
- Route handlers: thin. All logic in service files.
- Database: use prepared statements. No raw string concatenation in queries.
- All routes validated with zod schemas.
- Fastify plugins for cors, auth, logger.

### Kotlin Bridge
- Kotlin idiomatic style (data classes, sealed classes, extension functions).
- Each extension runs in isolated class loader to prevent conflicts.
- Failures in one extension are caught and logged, not propagated.

---

## 17. Future Features (Not in Initial Build)

These are planned for after the core app is stable. Do not implement in Phase 1–4.

- **AI Natural Language Search:** "Movie where the father dies and daughter becomes queen" → AI resolves to title → search.
- **AI Recommendations:** Based on watch history.
- **Auto Subtitle Translation:** Translate any subtitle to any language client-side or via API.
- **Voice Search:** Web Speech API.
- **Multiple User Profiles:** Separate history and favorites per profile (still no login — just local profiles).
- **Chromecast Support:** Cast to TV.
- **Offline Downloads:** Encrypted HLS download and local playback.

---

## 18. Glossary

| Term | Definition |
|---|---|
| CS3 | CloudStream extension file format (compiled Kotlin/JVM) |
| CS3 Bridge | The Kotlin/Ktor microservice in this project that loads and runs CS3 files |
| Provider | A content source (e.g., VegaMovies, HDHub4u). Each one is a separate CS3 extension |
| TMDB | The Movie Database — external API for metadata and posters |
| HLS | HTTP Live Streaming — the most common adaptive video format from providers |
| PWA | Progressive Web App — installable on iPad/Android home screen from the browser |
| IndexedDB | Browser-side database used via Dexie.js for offline history |
| SWR | Stale-While-Revalidate — React data fetching strategy (library by Vercel) |

---

*End of StreamHub Master Build Document — v1.0*
*Prepared for GLM-5 implementation. All phases, schemas, routes, UI specs, and architecture are defined above. Build in phase order. Ask for clarification only when a spec is genuinely ambiguous.*
