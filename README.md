# Merpati Senja — Island Hopper

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/hurulsufi12-art/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/hurulsufi12-art/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A 2D canvas flight game for the [best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057).
Fly a sunset island-hopping route in a little orange prop plane: take off from
Pulau Senja, thread three rings, deliver a parcel to Pulau Dua, and fly home
before the fuel runs out.

## How to play

Serve `game/` with any static server and open `index.html` in desktop Chrome.
No build step, no network requests, no assets — everything is drawn in code.

- **W / Up** — throttle up · **S / Down** — throttle down
- **Left / Right (or A / D)** — turn · **I / K** — climb / descend
- **Mouse** — fine pitch and roll trim · **Space** — air brake
- **Click or C** — chase / cockpit camera · **P** — pause · **R** — restart
- **Enter** — start

Land gently: touch down on a runway at under 500 ft/min with wings level.
Full throttle and hard reversals cost discipline; a steady throttle in the
green band earns a bonus. Fuel burns with throttle — plan the return leg.

## Missions

1. **Ring Run** — fly through rings 1–3 over the islands (+100 each).
2. **Parcel Drop** — land on the Pulau Dua runway (+500, refuel).
3. **Fly Home** — return to Pulau Senja and land before the fuel runs out.

## Files

- `main.ts` — Node 22 stdlib-only hand-in program: validates the entry
  (game caps, references, screenshots, dossier size) and writes
  `/output/dossier.json` via `buildDossier` from `vendor/makefun-game.ts`.
- `game/` — the game: `index.html` plus classic scripts in `game/src/`
  (config, controls, state, terrain, physics, missions, scene, instruments,
  capture, loop). No libraries, no modules, no network.
- `screenshots/` — 4 real renders of the game in headless Chromium,
  one per row of `shots.json` (`?shot=start|play|cockpit|end&seed=1`,
  frozen deterministic frames).
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Runs twice byte-identically in under 10 seconds per run.

## License

MIT — see `LICENSE`.
