# 2G Gated N-Back

A browser-based working memory training app implementing **2G Gated Dual N-Back** — an enhanced n-back task that trains both **input gating** (switching between four information streams) and **output gating** (OR, AND, XOR logic rules).

## What is 2G Gated N-Back?

Classic dual n-back trains working memory with two streams: spatial position and audio letters. The 2G gated variant extends this with:

- **Input gating** — Four streams (position, letter, color, shape) with cues indicating which streams are active each trial
- **Output gating** — Logic rules that define when to respond:
  - **OR** — Respond when any active stream matches n-back
  - **AND** — Respond only when all active streams match together
  - **XOR** — Respond when exactly one active stream matches (not both)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tutorial Mode

New to gated n-back? Tap **Start Tutorial** on the menu for a guided walkthrough:

1. Learn the four information streams
2. Understand 2-back matching
3. Practice OR, AND, and XOR output gates with hints
4. Practice input gating with different active streams

## How to Play

1. Choose your n-back level and session settings (or complete the tutorial first)
2. Watch the four stimulus streams: grid position, letter, color, and shape
3. Note the **input gate** — which streams are active this trial
4. Note the **output gate** — the OR / AND / XOR rule for responding
5. Press **Space** or tap **Match** when the output gate condition is satisfied for n-back matches on active streams

## Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

This project is configured for Vercel with `vercel.json` (Vite build → `dist/`).

```bash
npx vercel --prod
```

Or connect the GitHub repo in the [Vercel dashboard](https://vercel.com/new/clone?repository-url=https://github.com/xordddddddddd/2G-Gated---N-Back) for automatic deployments on push.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Web Audio API for letter tones
