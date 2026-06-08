# derrickmo.github.io

Personal website of **Derrick Mo** — machine-learning engineer and educator.
Part portfolio (Research · Learn · Build), part **interactive ML curriculum**: a
browser-based lab of **170+ hands-on demos** across 19 areas, a 20-module course,
flagship lessons, guided learning paths, and a linked concept graph — every
algorithm runs entirely in your browser.

🔗 Live: https://derrickmo.github.io

## The bigger picture — one curriculum, three surfaces
This site is the **visual, concept-first** surface of a single ML curriculum delivered
three ways from one source of content:
1. **Website** (this repo) — interactive, visual, intuition-building demos + walk-through lessons.
2. **Notebooks** — [machine_learning_tutorials](https://github.com/derrickmo/machine_learning_tutorials),
   the comprehensive, runnable, code-first reference (~200 notebooks).
3. **Mobile app** (planned) — a Flutter app for on-the-go learning, flashcards, and interview
   prep that **mirrors** this content.

The site visualizes concepts and links out to the notebooks for full code; the planned app
reuses the same content. (Internal planning lives in `_private/`, kept out of the repo.)

## Stack
- **Vite** multi-page static build → **GitHub Pages** (free tier).
- **React 18** loaded as UMD globals from a CDN; JSX compiled by Vite/esbuild (no `import React`).
- Plain CSS design tokens (`tokens.css`); no CSS framework. KaTeX (CDN) for math.
- Fonts: Space Grotesk, Inter, JetBrains Mono.
- **Zero backend** — every demo and game runs entirely in the browser.

## Local development
```bash
npm install
npm run dev       # http://localhost:5173 (live preview)
npm run build     # static output to dist/
npm run preview   # serve the production build
```
> Open the site through the dev server — opening an `.html` file directly won't work
> (the module scripts need to be served over HTTP).

## What's inside
- **Visualize** (`/visualize/`) — 170+ interactive demos in 19 categories (Foundations,
  Classical ML, Neural Networks, Transformers & NLP, RL, Generative & Signal, Agents & LLM
  Systems, Trustworthy & Explainable ML, Interpretability, Search & CSP, Efficiency & Systems,
  MLOps & Serving, Audio & Signal, Graphs & Networks, Probabilistic & Bayesian, Game Theory &
  Multi-Agent, Information Theory, …). Each implements the real algorithm in JS.
- **Learn** (`/learn/`) — a 20-module ML course (`curriculum.js` / `lectures.js`), 25 flagship
  on-site lessons, 127 per-concept sub-lessons, and a HuggingFace mini-course.
- **Concept graph** (`/concepts/`, `/concept-map/`) — ~180 concepts linked by prerequisites,
  tying every demo, lesson, and game together.
- **Guided paths** (`/paths/`) — curated multi-step learning tracks with progress tracking.
- **Playground** (`/playground/`) — build-a-classifier sandbox. **Play** (`/play/`) — AI games.
- **Insights** (`/weekly-insights/`) — a weekly ML research digest.

## Content model
- `concepts-index.js` — the concept graph (concepts + prereqs/leadsTo + tags linking every surface).
- `curriculum.js` / `lectures.js` — the 20-module course.
- `play-demos.js` — the demo registry + categories.
- `sub-lessons.js` — per-concept taught lessons. `paths.js` — guided paths.

## Project layout
```
index.html / landing-app.jsx     Home
about/ research/ cases/ work/     Portfolio pages
learn/                            Curriculum hub, 20 modules, flagship + sub-lessons, HuggingFace
visualize/<slug>/ + demos/        Interactive demos (one per page)
play/<slug>/ + games/             AI games
concepts/ concept-map/            Concept graph + force-directed map
paths/ playground/                Guided paths + build-a-model sandbox
weekly-insights/                  Weekly ML digest (data-driven)
chrome.jsx components/ tokens.css Shared UI, design tokens
public/                           favicon, 404, robots, sitemap, static assets
```

## Deployment
Pushing to the default branch builds with Vite and publishes `dist/` to GitHub Pages
(`.github/workflows/deploy.yml`).

## License
© Derrick Mo. All rights reserved unless noted otherwise.
