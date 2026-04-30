# AIDJ - AI Music Agent

> A futuristic AI DJ that chats with you, plays music based on weather and mood, and brings sci-fi aesthetics to life.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **AI DJ Chat** - Natural conversation with AI that understands music preferences
- **Weather-Based Recommendations** - Songs curated based on your local weather and mood
- **NetEase Cloud Music Integration** - QR code login, playlist browsing, and playback
- **MiniMax TTS** - Realistic voice synthesis for AI responses
- **Futuristic UI** - Ambient lighting, dotted grid, breathing animations

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **TTS**: MiniMax Speech Synthesis
- **Music API**: NetEase Cloud Music (Unofficial)

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/jaspering21/aidj.git
cd aidj/music-agent
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
MINIMAX_API_KEY=your_minimax_api_key_here
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
music-agent/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── aidj/          # AI chat & recommendations
│   │   │   ├── netease-login/ # QR login
│   │   │   ├── netease-player/# Audio URL fetching
│   │   │   └── tts/           # Text-to-speech
│   │   ├── components/
│   │   │   └── NeteaseLoginModal.tsx
│   │   ├── globals.css        # Futuristic UI styles
│   │   ├── layout.tsx
│   │   └── page.tsx           # Main UI
│   └── components/            # Player, Visualizer, etc.
├── public/
│   └── playlist_2205555594.txt
├── tts_minimax.js             # TTS WebSocket script
└── e2e.test.ts                # Playwright tests
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/aidj` | GET/POST | Chat, recommendations, next song |
| `/api/netease-login` | POST | QR key, scan check, login |
| `/api/netease-player` | GET | Audio URL, lyrics |
| `/api/tts` | POST | Text-to-speech |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MINIMAX_API_KEY` | MiniMax API key for TTS (get from [platform.minimax.chat](https://platform.minimax.chat)) |
| `NETEASE_COOKIE` | NetEase cookie (optional, QR login preferred) |

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

## Design Philosophy

The UI follows a **device interface** philosophy rather than traditional web UI:
- No heavy card borders - layers separated by subtle background shifts
- Ambient lighting instead of direct glow
- Breathing animations for status indicators
- Dotted grid background with subtle motion
- Increased spacing and minimalism

## License

MIT
