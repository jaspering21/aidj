# AIDJ Console UI Specification v2.0

## Concept & Vision

A cinematic, immersive sci-fi command console that feels like piloting a spacecraft through deep space. The interface is calm, atmospheric, and deeply immersive — not an app, but a futuristic system interface. Think Interstellar's ship computer meets Blade Runner 2049's ambient lighting.

**Core Philosophy**: Everything should feel like light diffusing in space — no sharp edges, no hard borders, just soft luminescence emerging from darkness.

## Design Language

### Aesthetic Direction
**"Ambient Void"** — Deep space blacks with diffused ambient light sources. Elements don't have borders — they emerge from the void through subtle contrast and luminosity. The UI feels like a physical device interface, not a software application.

### Color Palette
```css
--void-black: #050508
--deep-space: #080810
--panel-bg: rgba(10, 10, 18, 0.4)
--glass-bg: rgba(255, 255, 255, 0.02)
--glass-border: rgba(255, 255, 255, 0.05)

/* Soft, diffused neon - no harsh edges */
--neon-cyan: rgba(0, 245, 255, 0.7)
--neon-blue: rgba(77, 124, 255, 0.6)
--neon-purple: rgba(168, 85, 247, 0.5)
--neon-magenta: rgba(244, 114, 182, 0.4)
--neon-green: rgba(16, 185, 129, 0.6)

/* Ambient light sources */
--light-primary: rgba(0, 245, 255, 0.12)
--light-secondary: rgba(168, 85, 247, 0.08)
--light-tertiary: rgba(244, 114, 182, 0.05)

/* Text - low contrast for calm reading */
--text-primary: rgba(232, 234, 240, 0.85)
--text-secondary: rgba(180, 185, 200, 0.5)
--text-muted: rgba(120, 125, 140, 0.35)
```

### Typography
- **Display Font**: "Orbitron" — geometric, futuristic for clock and headings
- **Body Font**: "IBM Plex Mono" — technical, readable for all other text
- **Fallback**: monospace

### Spatial System
- Base unit: 8px
- Panel padding: 20-24px
- Section spacing: 32-48px (generous emptiness)
- Border radius: 20px (panels)
- Max width: 420px (centered console)
- Clock takes visual priority — everything else is secondary

### Motion Philosophy
- **Breathing**: All ambient lights pulse very slowly (8-12s cycles)
- **Clock flicker**: Subtle opacity fluctuation for digital authenticity (pause on hover)
- **Entrance**: Elements fade in and slide up with staggered delays
- **Status**: Live indicator pulses with expanding ring
- **Interactions**: Subtle, quick (200-300ms), never jarring

### Visual Assets
- **Background**: Layered depth — dot grid (4% opacity) → noise texture (3% opacity) → ambient light orbs
- **Light sources**: 3 radial gradients as main ambient lights, very diffused
- **No borders on panels**: Subtle top-edge light only (1px gradient line)
- **Scanlines**: Nearly invisible horizontal lines (1.5% opacity)

## Layout & Structure

```
┌─────────────────────────────────────────────┐
│                                             │
│  ○ ○ ○              ☀️ 22°                │  ← Minimal header
│                                             │
│                                             │
│           ╭─────────────────╮              │
│           │                 │              │
│           │    02:41:33     │              │  ← CLOCK (dominant)
│           │   05.01 · THU   │              │
│           │     [glow]      │              │
│           ╰─────────────────╯              │
│                                             │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  NOW PLAYING                       │    │  ← Seamless panel
│  │  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░  34%         │    │
│  │  Track Name                        │    │
│  │  Artist                            │    │
│  └────────────────────────────────────┘    │
│                                             │
│            [⏮]    [⏯]    [⏭]              │  ← Floating controls
│                                             │
│         🔊 ─────────────────────            │  ← Minimal volume
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  ● AIDJ                           │    │
│  │  [AI bubble]    [user bubble]     │    │  ← Chat bubbles
│  │  [............input...............] │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  PLAYLIST                          │    │
│  │  01  Track - Artist        ▌▌▌▌    │    │
│  │  02  Track - Artist                 │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ● ON AIR              user123             │  ← Status footer
│                                             │
└─────────────────────────────────────────────┘
```

### Responsive Strategy
- Mobile-first: 100% width with generous padding
- Max-width container centered on larger screens
- All spacing scales proportionally

## Features & Interactions

### 1. Central Clock (Dominant Element)
- **Display**: HH:MM:SS format, large Orbitron font (4rem)
- **Glow**: Soft radial gradient behind digits, pulsing slowly
- **Flicker**: Subtle opacity animation (paused on hover for readability)
- **Date**: Small text below with muted color
- **Animation**: clock-glow-pulse (4s), digit-flicker (0.1s)

### 2. Ambient Light Layers
- **Primary light**: Behind clock, cyan tint, breathing (8s)
- **Secondary light**: Upper right, purple tint, breathing reverse (10s)
- **Tertiary light**: Lower left, magenta tint, breathing (12s)
- All lights are diffused radial gradients, no sharp edges

### 3. Status Dots
- Three dots with staggered breathing animation
- Colors: cyan, purple, magenta
- Very subtle — just enough to indicate system life

### 4. Now Playing Panel
- **Progress bar**: Ultra-minimal 3px height, soft gradient fill with diffused leading edge glow
- **Track info**: Large track name, muted artist
- **Percentage**: Small muted text right-aligned

### 5. Playback Controls
- **Buttons**: Transparent, no borders, icon-only
- **Play button**: 72px circular, radial gradient background
- **Hover**: Soft glow appears, not harsh border
- **Active/Playing**: Purple tint glow

### 6. Volume Slider
- No visible track border
- 3px height, very subtle fill
- Thumb: Small cyan circle with soft glow

### 7. AI DJ Chat
- **Container**: Seamless glass panel
- **Bubbles**: Float in/out with animation
  - User: Cyan-tinted, right-aligned
  - AI: Purple-tinted, left-aligned
- **Input**: Full-width, subtle background, no border
- **Focus**: Soft cyan glow

### 8. Playlist
- **Items**: Separated by very subtle lines (2% opacity)
- **Active item**: Slight background tint, purple accent
- **Sound bars**: Animated equalizer when playing

### 9. ON AIR Indicator
- **Live**: Green dot with expanding pulse ring
- **Standby**: Muted gray dot, no animation
- **Animation**: live-pulse (2s cycle)

## Component Inventory

### AmbientLight
- Fixed position radial gradients
- Very large (400-600px)
- Multiple layers with different colors
- Slow breathing animations

### ClockDisplay
- Orbitron font, large size
- ClockGlow behind it (radial gradient, blurred)
- DigitFlicker animation
- Date subtitle below

### StatusDots
- Flexbox row of 3 dots
- Each with staggered breathing animation
- Very low opacity (0.3 base)

### GlassPanel
- Semi-transparent background
- Heavy backdrop blur
- Top edge only: subtle gradient line
- No visible borders

### ProgressBar
- 3px height, rounded
- Gradient fill (cyan → purple)
- Leading edge: diffused glow
- Percentage text right-aligned

### ControlButton
- Transparent background
- Icon only, no border
- Hover: soft radial glow
- Play button special: larger, gradient background

### VolumeSlider
- Custom styled range input
- No visible border on track
- Small cyan thumb with glow

### ChatBubble
- Rounded corners (14px)
- User: cyan tint, right
- AI: purple tint, left
- Float-in animation

### ChatInput
- Full width
- Subtle background (2% white)
- No border, no outline
- Focus: soft cyan glow

### PlaylistItem
- Padding with subtle separator
- Hover: very subtle background
- Active: purple tint + sound bars

### StatusIndicator
- Live dot with pulse animation
- Text label (ON AIR / STANDBY)
- Color changes based on state

## Technical Approach

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + CSS variables + inline styles
- **Fonts**: Google Fonts (Orbitron, IBM Plex Mono)
- **Icons**: Inline SVGs (Lucide-style)
- **Animation**: CSS keyframes
- **State**: React useState/useRef

### Key CSS Variables
```css
--void-black: #050508
--panel-bg: rgba(10, 10, 18, 0.4)
--neon-cyan: rgba(0, 245, 255, 0.7)
--neon-purple: rgba(168, 85, 247, 0.5)
--text-primary: rgba(232, 234, 240, 0.85)
--text-muted: rgba(120, 125, 140, 0.35)
```

### Animation Keyframes
- `ambient-breathe`: opacity 0.6→1, scale 1→1.1, 8-12s ease-in-out infinite
- `clock-glow-pulse`: opacity 0.5→1, 4s ease-in-out infinite
- `digit-flicker`: opacity 1→0.97, 0.1s ease-in-out infinite (paused on hover)
- `dot-breathe`: opacity 0.2→0.6, scale 0.9→1.1, 4s ease-in-out infinite (staggered)
- `live-pulse`: box-shadow expand + fade, 2s ease-out infinite
- `sound-wave`: scaleY + opacity cycling, 0.8s ease-in-out infinite (staggered)
- `bubble-float`: opacity + translateY, 0.35s ease-out
- `fadeIn`: opacity 0→1, 0.8s ease-out
- `slideUp`: opacity 0→1 + translateY 24px→0, 0.8s ease-out

### Background Layers (z-index order)
1. `body::before` — Dot grid (z-index: 1)
2. `body::after` — Noise texture (z-index: 2)
3. `.ambient-light-*` — Ambient light orbs (z-index: 0)
4. `.main-content` — UI elements (z-index: 10)
5. `.scanlines` — Scanline overlay (z-index: 100)
