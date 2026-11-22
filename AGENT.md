# AGENT.md — build notes for The Night Curator

## What it is
An original top-down stealth game, written from scratch for the make.fun
"Make the best stealth game" bounty (slug best-stealth-game-20261121-1759).
No starter code was reused for the game itself; the kit's starter is a
dodge-and-collect game and was not copied. `vendor/makefun-game.ts` is the
kit's file, copied unchanged, as RULES.txt requires.

## Layout
- `game/index.html` — page, HUD, overlays
- `game/css/style.css` — HUD and overlay styling
- `game/js/main.js` — states, input, pickups, lives, level flow, HUD
- `game/js/levels.js` — 3 level maps (ASCII grids) + parsing, LOS, BFS paths
- `game/js/guards.js` — patrol AI, vision cones, suspicion, alarm, recovery
- `game/js/player.js` — movement, collision, noise, coin throws
- `game/js/render.js` — canvas drawing (floor, cones, cover, light, HUD toast)
- `game/js/audio.js` — WebAudio synthesized SFX, no audio files
- `game/js/shots.js` — deterministic `?shot=` scenes for the screenshots
- Touch controls (added 2026-11-22, after the submitted entry): a virtual
  joystick + SNEAK/COIN/pause buttons in `game/index.html`,
  `game/css/style.css` and `game/js/main.js`. They only write the same
  `input` flags the keyboard writes, so no game logic changed. The
  submitted entry (commit 2ca331e) is untouched; touch support lives in
  the commit on top of it.
- `main.ts` — Node 22 stdlib only; copies game/ + screenshots/ to /output
  and writes dossier.json via the vendored makefun-game library
- `screenshots/` — 4 real renders of the game's own code (headless Chrome)

## Rules of the game
- Guards patrol waypoint loops (BFS paths on the tile grid) and pause to scan.
- A guard sees the player inside its cone (250 px, ~70°), with line of sight
  unblocked by walls/cover. Visibility scales with distance, light (shadow
  tiles hide you) and movement (sneaking hides, running exposes).
- Suspicion 0–100 fills while seen, drains while hidden. At 100 the guard
  chases; if it loses sight for 3.5 s it searches the last seen spot, then
  gives up and returns to patrol (the recovery chance). Caught = lose a life.
- Running footsteps emit noise (radius 190 px) that pulls guards to
  investigate; a thrown brass coin (click, 3 per level) does the same at
  its landing point with a louder radius.
- Each level: grab the glowing artifact, then reach the green EXIT.
  Gems are optional score. 3 lives; losing all 3 ends the run.

## Screenshots
Taken with headless Chrome against a local static server:
`?shot=start` (title over the hall), `?shot=patrol` (sneaking at a cone's
edge), `?shot=chase` (alarm, guard closing in), `?shot=exit` (artifact in
hand, exit open). Each is a real render of the game's own code.

## Checks run
- `node --check` on every game JS file
- Level validator: all rows equal length, exit/artifact/loot reachable from
  the player start by BFS, every guard waypoint walkable and reachable
- `MAKEFUN_OUTPUT_DIR=out node main.ts` run twice, outputs diffed byte-identical
