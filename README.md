# AIDJ - AI Music DJ

> A futuristic AI DJ that chats with you, plays music based on weather and mood, and brings sci-fi aesthetics to life. Now with commercial-grade reliability, error handling, and user features.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Core Features
- **AI DJ Chat** - Natural conversation with AI that understands music preferences
- **Weather-Based Recommendations** - Songs curated based on your local weather and mood
- **NetEase Cloud Music Integration** - QR code login, playlist browsing, and playback
- **MiniMax TTS** - Realistic voice synthesis for AI responses
- **Futuristic UI** - Ambient lighting, dotted grid, breathing animations

### Commercial Features
- **Loading States** - Skeleton screens and toast notifications for smooth UX
- **User Preferences** - Volume, auto-play, TTS settings persisted
- **Play History** - Track your recently played songs (50 entries)
- **Favorites** - Like and save your favorite songs
- **Rate Limiting** - API protection against abuse
- **Request Caching** - Weather, recommendations, YouTube searches cached
- **Error Tracking** - Sentry integration for production monitoring
- **Graceful Degradation** - Offline-friendly with fallback responses

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Edge-ready)
- **TTS**: MiniMax Speech Synthesis
- **Music API**: NetEase Cloud Music (Unofficial)
- **Error Tracking**: Sentry (optional)
- **Storage**: Local filesystem (`~/.aidj/`)

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/jaspering21/aidj.git
cd aidj
npm install
```

### 2. Configure Secrets

Create `~/.aidj/secrets.json` with your API keys:

```json
{
  "minimax_api_key": "your_minimax_api_key",
  "netease_cookie": "your_netease_cookie (optional)"
}
```

For Sentry error tracking (optional):

```json
{
  "minimax_api_key": "your_key",
  "sentry_dsn": "https://your-dsn@sentry.io/project"
}
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Login

Click **LOGIN** and scan the QR code with NetEase Cloud Music app.

## Project Structure

```
aidj/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── aidj/            # AI chat & recommendations
│   │   │   ├── favorites/       # Favorite songs management
│   │   │   ├── health/          # Health check endpoint
│   │   │   ├── netease-login/   # QR login
│   │   │   ├── netease-player/  # Audio URL, lyrics
│   │   │   ├── play-history/    # Playback history
│   │   │   ├── preferences/     # User preferences
│   │   │   └── tts/             # Text-to-speech
│   │   ├── components/
│   │   │   └── NeteaseLoginModal.tsx
│   │   ├── globals.css          # Futuristic UI styles
│   │   ├── layout.tsx
│   │   └── page.tsx            # Main UI
│   └── components/
│       ├── Background/
│       ├── Info/
│       └── Player/
├── src/lib/
│   ├── cache.ts           # Request caching
│   ├── errors.ts          # Error handling utilities
│   ├── favorites.ts       # Favorites management
│   ├── netease.ts        # NetEase API wrapper
│   ├── play-history.ts   # Play history management
│   ├── preferences.ts    # User preferences
│   ├── rate-limit.ts     # Rate limiting
│   ├── retry.ts          # Retry with exponential backoff
│   └── sentry.ts         # Sentry integration
├── sentry.client.config.ts
├── sentry.server.config.ts
├── tts_minimax.js        # TTS WebSocket script
└── e2e.test.ts           # Playwright tests
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/aidj` | GET/POST | Chat, recommendations, weather, next song |
| `/api/favorites` | GET/POST/DELETE | Manage favorite songs |
| `/api/play-history` | GET/POST/DELETE | Manage playback history |
| `/api/preferences` | GET/POST | User preferences (volume, autoPlay, TTS) |
| `/api/netease-login` | POST | QR key, scan check, login, logout |
| `/api/netease-player` | GET | Audio URL, lyrics, session validation |
| `/api/tts` | POST | Text-to-speech (Edge TTS fallback) |
| `/api/health` | GET | Health check |

## Configuration

### Secrets File (`~/.aidj/secrets.json`)

| Field | Description |
|-------|-------------|
| `minimax_api_key` | MiniMax API key for TTS (get from [platform.minimax.chat](https://platform.minimax.chat)) |
| `netease_cookie` | NetEase cookie for playback (optional, QR login preferred) |
| `sentry_dsn` | Sentry DSN for error tracking (optional) |

## Development

### Build

```bash
npm run build
```

### Type Check

```bash
npx tsc --noEmit
```

### Test

```bash
npm run test
```

## Commercial Readiness

This project has been improved to meet commercial standards:

| Category | Features |
|----------|----------|
| **Error Handling** | try/catch on all routes, safeError responses, no internal leaks |
| **Input Validation** | Type checking, range validation, array validation |
| **Retry Logic** | Exponential backoff (3 retries, 500ms-5s) |
| **Type Safety** | No `any` types, proper interfaces on all routes |
| **Rate Limiting** | Per-endpoint limits (10-60 req/min) |
| **Caching** | Weather (5min), recommendations (5min), YouTube (permanent) |
| **UX** | Skeleton loading, toast notifications, user-friendly errors |
| **User Features** | Preferences persistence, play history (50 entries), favorites |
| **Monitoring** | Sentry integration (optional, graceful degradation) |

## Design Philosophy

The UI follows a **device interface** philosophy rather than traditional web UI:
- No heavy card borders - layers separated by subtle background shifts
- Ambient lighting instead of direct glow
- Breathing animations for status indicators
- Dotted grid background with subtle motion
- Increased spacing and minimalism

See [SPEC.md](./SPEC.md) for detailed design specifications.

## License

MIT