# Regatta — Sailing Yacht Simulator

Interactive sailing education app. Learn points of sail, sail trim, racing strategy and sailing terminology in Russian and English.

**Live:** https://regatta.icoffio.com

## Features

- **Interactive Simulator** — drag/arrow-key to rotate the yacht, watch sails trim automatically, see current point of sail in RU/EN.
- **Points of Sail** — circular wind diagram with all sailing courses (Левентик, Бейдевинд, Галфвинд, Бакштаг, Фордевинд).
- **Racing Strategy** — race course diagrams, upwind/downwind strategies, right-of-way rules, key concepts (layline, VMG, clear air).
- **Race Game** — compete with AI opponents on three difficulty levels with real sailing physics.
- **Glossary** — 51 bilingual sailing terms across 7 categories.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- HTML5 Canvas for the simulator and game
- SVG for static diagrams
- Standalone output for small Docker images

## Develop

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Production build

```bash
npm run build
npm start
```

## Docker

```bash
docker compose up -d --build
# → http://localhost:4500 (bound to docker bridge 172.17.0.1)
```

## Deployment

Deployed on the shared `icoffio.com` VPS via Docker Compose + nginx reverse proxy. See `DEPLOY.md`.
