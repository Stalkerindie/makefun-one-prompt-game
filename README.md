# Ghost Dash 👻

A tiny one-button arcade dodger, built from a single prompt.

A little ghost flies through a neon night sky. Hold one button to rise,
let go to swoop down — dodge the bats, grab the stars.

## Play

**Live:** https://stalkerindie.github.io/makefun-one-prompt-game/

Or open `index.html` in any browser — pure static HTML/CSS/JS, no network
requests, no build step.

## Controls

- **Keyboard:** hold `SPACE` / `↑` / `W` to fly up, release to fall down
- **Touch / mouse:** press and hold anywhere, release to drop
- `ENTER` starts / restarts

## Rules

- Score grows while you survive (+2/sec) and **+10 per star**
- **3 lives** — a bat costs one, with 2 seconds of mercy invincibility
- Bats get faster and more frequent the longer you survive
- Best score is saved on your device

## Files

- `index.html` — page, HUD, start & game-over screens
- `style.css` — neon night styling
- `game.js` — game logic (canvas rendering, physics, collisions)

## License

MIT — see [LICENSE](LICENSE).
