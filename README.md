# Single Egg — Frontend Showcase

A high-fidelity, scroll-driven single-page showcase designed for **Shenzhen Suiyuan Technology Co., Ltd.** (深圳随元科技有限公司).  
This project is a frontend demonstration that tells a visual story through cinematic scroll animations, frame-by-frame canvas sequences, and choreographed typography.

> **Live Demo**: [GitHub Pages](https://Shenzhen-Suiyuan-Tech.github.io/web_design_demo_2/) (when deployed)

---

## Overview

This is a **Vite + TypeScript + GSAP** frontend project built as an external-facing design showcase. The page presents a multi-section narrative experience driven entirely by user scroll, featuring:

- **6 immersive sections** with pinned and unpinned scroll behaviors
- **Canvas-based frame scrubbing** (630+ pre-rendered frames across 3 sequences)
- **GSAP ScrollTrigger** for precision scroll-linked animations
- **Real-time text choreography** — position, opacity, blur, and clip-path transitions
- **Responsive layout** with mobile-first breakpoints
- **Adaptive navigation** with dark/light theme switching based on section background

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [GSAP](https://greensock.com/gsap/) + ScrollTrigger | Scroll-driven animations & pinning |
| HTML5 Canvas | Frame-by-frame image rendering |
| CSS3 | Layout, responsive design, visual effects |

---

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Shenzhen-Suiyuan-Tech/web_design_demo_2.git
cd web_design_demo_2
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add frame sequences

The project requires three pre-rendered image sequences for the canvas animations. These are **not included** in the repository due to file size. Place them in the `public/` directory:

```
public/
├── egg/                    # Section 1: single-egg zoom sequence
│   ├── frame_0001.jpg
│   ├── frame_0002.jpg
│   └── ...
│   └── frame_0180.jpg      # 180 frames total
│
├── egg_multiple/           # Section 2: multi-egg focus-pull sequence
│   ├── frame_0001.jpg
│   ├── frame_0002.jpg
│   └── ...
│   └── frame_0150.jpg      # 150 frames total
│
└── crack_egg/              # Section 5: crack-egg sequence
    ├── frame_0262.jpg      # starts at frame 262
    ├── frame_0263.jpg
    └── ...
    └── frame_0561.jpg      # 300 frames total (262–561)
```

> **Frame naming**: Files must follow the pattern `frame_XXXX.jpg` (zero-padded 4 digits).

### 4. Start development server

```bash
npm run dev
```

The dev server will start at `http://localhost:5173` (or the port specified by the `PORT` environment variable).

### 5. Build for production

```bash
npm run build
```

Output will be generated in the `dist/` directory.

### 6. Preview production build

```bash
npm run preview
```

---

## Architecture Highlights

### Scroll Architecture

The page is built around **GSAP ScrollTrigger** with a mix of pinned and unpinned sections:

| Section | Behavior | Description |
|---------|----------|-------------|
| Section 1 (Hero) | **Pinned** | Single-egg canvas scrub with zoom (0.5× → 10×) + dissolve to black |
| Section 2 (Many Eggs) | **Pinned** | Multi-egg canvas scrub with focus-pull blur + text choreography |
| Section 3 (White Eggs) | Unpinned | Scroll-scrubbed image width (150% → 100%) + parallax text |
| Section 4 (Light Flow) | Unpinned | Static content section with gradient title |
| Section 5 (Crack Egg) | **Pinned** | 300-frame crack-egg sequence + spec comparison reveal |
| Section 6 (Curtain) | *Rides Section 5* | Gray curtain rise + product egg fade-in + clip-path text transition |

### Frame Rendering

- All canvas sections use **preloaded image sequences** rendered frame-by-frame based on scroll progress.
- Images are drawn with **cover-fit scaling** to ensure full-bleed visuals across all viewport sizes.
- DPR-aware canvas sizing (capped at 2×) for crisp rendering on Retina displays.

### Text Choreography

Text elements use `position: fixed` with JavaScript-driven transforms:
- **Section 1 → 2 handoff**: Three content lines converge and stack, then rise and fade together.
- **Section 2**: Secondary text fades in, moves up, and fades out in three phases.
- **Section 5 → 6**: Spec lists fade in and fall into position; white text is clipped by a rising curtain to reveal black text underneath.

### Navigation

- Fixed top navbar with **frosted glass** (`backdrop-filter: blur`)
- **Dark/light auto-switching**: Theme follows the current section's background
- **Active link tracking**: Underline follows scroll position (or immediate click)
- Responsive: links collapse on mobile (`< 768px` or portrait aspect ratio)

### Loading Experience

A full-screen loader with progress bar preloads all 630 frames before revealing the page, ensuring smooth scrubbing from the first scroll.

---

## Browser Support

- Chrome / Edge / Firefox / Safari (latest 2 versions)
- iOS Safari 14+
- Chrome for Android (latest)

> **Note**: Heavy use of `position: fixed`, `backdrop-filter`, and canvas rendering. Performance may vary on low-end mobile devices.

---

## Key Design Decisions

### 1. Pure TypeScript + GSAP — No Framework

We deliberately chose **no frontend framework** (React, Vue, etc.). This showcase is animation-driven, with every section requiring precise control over DOM manipulation, fixed positioning, and scroll timing. A framework's virtual DOM, component lifecycle, and reactivity model would add overhead and introduce unpredictable interference with GSAP's scroll pinning and direct element transforms. The result is a small runtime, zero dependencies on a UI framework, and full transparency in how every animation and layout state is orchestrated.

### 2. Vite as the Build Tool

Vite was chosen for its **fast dev server** and **ESM-native bundling**, which aligns perfectly with our lightweight, module-first approach. It handles TypeScript compilation, HMR, and asset handling out of the box with virtually zero configuration, keeping the build pipeline lean and focused.

### 3. Pre-rendered Frame Sequences over Video

Instead of embedding video files, we use **630+ pre-rendered JPEG frames** scrubbed via Canvas. This is a deliberate creative and technical decision:
- **Frame-perfect control** — every scroll pixel maps to a discrete frame, with no buffering, keyframe seeking, or compression artifacts
- **Seamless compositing** — Canvas layers can be blended with HTML/CSS overlays (text, blur, opacity, clip-path) in real time, impossible with native video playback
- **Predictable performance** — all frames are preloaded, eliminating the stuttering or network latency inherent in streamed video

### 4. Canvas 2D over WebGL

For this project's visual language — photographic realism with scroll-driven frame scrubbing — **Canvas 2D** is the pragmatic sweet spot. WebGL would add shader complexity and texture management overhead without meaningful visual payoff. The 2D `drawImage` API with cover-fit scaling renders full-bleed frames efficiently across devices, from mobile to 4K displays.

### 5. GSAP ScrollTrigger as the Unified Scroll Engine

ScrollTrigger was chosen as the single source of truth for all scroll behavior, consolidating pinning, scrubbing, and progress callbacks into one system. Rather than stitching together multiple lightweight libraries (e.g., Locomotive Scroll + a separate pinning solution), we use one robust, battle-tested engine that guarantees precise synchronization between scroll position and every frame, text transition, and layout shift across the entire narrative.

### 6. Seamless Section Transitions via Shared Pinning

Sections 5 (Crack Egg) and 6 (Curtain Reveal) are fused into a **single continuous pinned scroll trigger**. This is a core narrative design decision: the crack-egg sequence ends exactly where the gray curtain begins to rise, with zero dead space between them. The viewer experiences a continuous visual flow rather than a segmented "page-by-page" scroll.

### 7. Pre-entry Fade as a Narrative Bridge

The transition from Section 4 (light, airy) to Section 5 (dark, dramatic) uses a **pre-entry fade** — the crack-egg canvas begins materializing before its pin formally engages. Rather than treating this as a gap fix, we designed it as a narrative bridge: the dark image slowly emerges while the viewer is still in the light section, creating a smooth tonal shift that feels cinematic rather than abrupt.

### 8. CSS Custom Properties for Visual-Logic Decoupling

The final product layout (egg positions, spec column widths) is controlled entirely via CSS variables (`--s6-egg-left-x`, `--s6-egg-right-x`, `--s6-spec-width`). This is an intentional design system decision: visual positioning lives in CSS, while the animation logic in TypeScript only reads and applies these values. Designers can adjust the layout by editing CSS alone, without ever touching the animation code.

### 9. TypeScript for Structural Integrity at Scale

With 600+ lines of core animation logic managing progress calculations, layout math, scroll triggers, and state transitions across 6 sections, **compile-time type safety** is not a luxury but a necessity. TypeScript's strict mode catches coordinate mismatches, progress boundary errors, and state transition bugs before they reach the runtime.

---

## License

ISC © Shenzhen Suiyuan Technology Co., Ltd.

---

## Contact

- **Company**: 深圳随元科技有限公司 (Shenzhen Suiyuan Technology Co., Ltd.)
- **Repository**: https://github.com/Shenzhen-Suiyuan-Tech/web_design_demo_2
- **Issues**: https://github.com/Shenzhen-Suiyuan-Tech/web_design_demo_2/issues
