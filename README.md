# Ember Sigil Duel

A turn-based card duel for make.fun's "Make the best card game" bounty
(`best-card-game-20261122-1826`). Original game, no commercial names, art
or music copied.

## The game

You duel Sable, the Mirror Warden. Life 30 vs 30, mana grows 1 per turn up
to 10. Twelve original cards in four suits — Ember, Tide, Gale, Stone —
each with a cost, an attack and a shield value. Suits are told apart by
colour *and* shape.

Playing two suits on the same turn chains a combo: Ember + Gale is
Wildfire (+3 attack), Tide + Stone is Mudwall (+4 shield), Ember + Tide is
Steam Veil, Gale + Stone is Sandstorm, Gale + Tide is Mistral, and the same
suit twice is Resonance (+2 attack). Damage goes through shield first.
Sable reads the table: it shields up when its life is low and spends its
mana on the hardest hits otherwise.

Play with mouse or keyboard: click a card (or press 1–7) to play it, E or
the End Turn button to pass. Space starts and restarts.

## Layout

- `game/` — the static game. `index.html` plus `src/` modules, one job
  each: `config` (cards, tuning), `deck`, `ai` (opponent + autopilot),
  `world` (duel rules), `input`, `render`, `shots` (screenshot staging),
  `main` (boot + loop). No network requests, no build step.
- `screenshots/` — 1-start, 2-play, 3-win, 4-loss (1280x800 JPEG, staged
  with `?shot=…&seed=7`, see `shots.json`).
- `main.ts` — hands the entry in (copies `game/` + `screenshots/`, writes
  `dossier.json`).
- `serve.ts` — `node serve.ts`, then open http://localhost:8080.

## Play-test

Seed 7, live in headless Chromium: a real mouse click plays a card
(enemy 30 → 28 life, mana 1 → 0), a real End Turn click runs Sable's
animated turn (turn 2, your life 29), the duel is won in 9 turns
(score 1361) and lost in 6 turns when passing every turn (score 145).
Zero console errors.
