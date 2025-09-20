# Pumpkin Raider — Cozy Retro Arcade 🎃

Welcome to Pumpkin Raider — a tiny cozy arcade packed with three retro mini-games. It's all about comfy vibes, crunchy leaves, and silly high scores. Perfect for late-night snack breaks and aesthetic pumpkins.

## The Games

1. Leaf Me Alone (🍂) — Catch falling leaves before they hit the ground.
2. Pumpkin Dunkin (🎃) — Toss pumpkins into a hoop for sweet points.
3. Pawc-Man (🐈) — A cat-themed, cozy take on classic maze munching Pacman.

Each game lives in its own folder (`leaf/`, `pumpkin/`, `catnap/`) and uses an inside-the-GameBoy canvas area for gameplay.

## Project Files

- `index.html` — Intro landing with typewriter crawl and game selector.
- `style.css` — Global styles and GameBoy UI framing.
- `pumpkin/` — Pumpkin Dunkin game (HTML + JS).
- `leaf/` — Leaf Me Alone game (HTML + JS).
- `catnap/` — Pawc-Man / Cozy Cat game (HTML + JS).
- `Assets/` — Images and gifs used across the games.

> Note: this project is wrapped with Electron for a desktop app experience. Use `npm start` to launch the Electron shell locally.

## Cute features

- Cozy typewriter intro with tiny blips.
- GameBoy-styled canvas for in-game rendering and green digital score display (Pumpkin implemented).
- Floating help button (?) on game pages.
- Animated heading emojis and fall-themed styling.

## Run locally (Windows PowerShell)

Open PowerShell, cd into the project folder and run:

```powershell
npm install; npm start
```

This will start the Electron app. You can also open `index.html` in a browser for a quick preview (audio and Electron-specific features may be limited).

## Quick test checklist

- Intro behavior:
  - Click inside the crawl: the Enter button appears but the crawl stays visible.
  - Press `Escape`: all intro text is revealed and the Enter button enables (landing remains visible).
  - Click Enter: the main menu appears.

- Game pages:
  - GameBoy is centered and sized so control buttons are visible.
  - Pumpkin Dunkin displays the green digital score on the GameBoy canvas.
  - Leaf Me Alone: the canvas score is pending (todo — copy the Pumpkin score rendering to `leaf/game.js`).
  - Click the floating `?` for help overlays.
  - Exit button is pinned to the top-right.

## Development notes

- To add the same canvas score behavior to Leaf: copy `drawCanvasScore()` from `pumpkin/pumpkin.js` into `leaf/game.js` and call it from the Leaf game loop.
- Most styling lives in `style.css`.


## 🧸 A friendly note

This repo is meant to be cozy and approachable — feel free to tweak the fonts, swap sprites in `Assets/`, or add your own microgames. If you make improvements, I’d love to see a screenshot or a PR!

If you'd like, I can add a short `CONTRIBUTING.md`, wire Leaf's canvas score, or create a short packaged build script for Windows.
