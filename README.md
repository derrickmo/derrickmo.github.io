# derrickmo.github.io

Personal website of **Derrick Mo** — machine learning engineer. A portfolio
across three pillars: **AI engineering (consulting)**, **ML teaching**, and
**research / collaboration** — plus an interactive lab of in-browser ML demos.

🔗 Live: https://derrickmo.github.io

## Stack
- **Vite** multi-page static build → **GitHub Pages** (free tier).
- **React 18** (loaded as UMD globals from a CDN; JSX compiled by Vite/esbuild).
- Plain CSS design tokens (`tokens.css`); no CSS framework.
- Fonts: Space Grotesk, Inter, JetBrains Mono.
- Zero backend — every interactive demo runs entirely in the browser.

## Local development
```bash
npm install
npm run dev       # http://localhost:5173 (live preview)
npm run build     # static output to dist/
npm run preview   # serve the production build
```
> Open the site through the dev server — opening an `.html` file directly won't
> work (the module scripts need to be served over HTTP).

## Structure
```
index.html / landing-app.jsx     Home
about/                           About
research/                        Research — publications & patents
cases/                           Consulting — how I work
learn/                           ML curriculum hub + 20 module overviews
  <module>/                        condensed module lecture
  transformers/self-attention/     a full on-site lesson
play/                            Interactive ML demos
  <demo>/                          one demo per page
components/                      Shared UI + diagram components
chrome.jsx                       Shared nav / footer / layout
tokens.css                       Design tokens
public/                          favicon, 404, robots, sitemap, static assets
```

## Content model
- `curriculum.js` — the 20-module ML curriculum (grouped into tracks).
- `lectures.js` — condensed on-site lecture content for each module.
- `play-demos.js` — registry of the interactive demos.

The full, runnable course notebooks live in a companion repo:
[machine_learning_tutorials](https://github.com/derrickmo/machine_learning_tutorials).

## Deployment
Pushing to the default branch builds with Vite and publishes `dist/` to GitHub
Pages.

## License
© Derrick Mo. All rights reserved unless noted otherwise.
