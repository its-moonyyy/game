# Design: Mountain (remplacement vertical slice)

Date: 2026-10-03
Status: approved in chat (5/5 sections), pending spec review

## 1. Goal

Replace the horizontal game with a 2-player local co-op vertical
platformer: two penguins tied by a physical rope climb a snowy
mountain (~5000 px) to the summit. Camera follows the players.
Online play is kept. Vanilla JS, separate files, static hosting.

Vertical slice first: mountain + camera + rope chain + two playable
penguins to the summit. Phase 2+: wall-grab/stamina, Jeff rocks,
moving platforms, rich victory screen, squash animations.

## 2. Architecture and files

The skeleton stays (`config`, `world`, `sim/`, `render/`, `input/`,
`net/`, `ui/`, `main`, CONTRACTS, mirror tests). Changes:

- `sim/rope.js` (new): Verlet chain, 12 points, iterated distance
  constraints, anchors (players now, Jeff rocks in phase 2). Pure
  and DOM-free testable.
- `sim/physics.js`: AABB collisions extended to gentle slopes
  (authored as 8 px micro-steps, climbed by the existing engine);
  rope pulls players through the existing shares/anchor rule.
- `render/camera.js` (new): follows the players' midpoint with
  upward lookahead, clamped to level bounds. Never synced.
- `render/draw.js`: draws with camera offset (`ctx.translate`):
  snow, platforms, walls, rope chain, penguins as canvas shapes.
- `js/levels/mountain-1.js` + registry: 960x5000 world, platforms,
  short vertical walls, pits, 2-3 checkpoints, summit.
- `sim/rules.js`: checkpoints (touch to activate), void fall to
  last checkpoint, summit to victory + frozen chrono, R resets
  world + chrono.
- `input/keyboard.js`: Bread on Q/D/Z/S, Fred on arrows, matched
  by `e.code` (layout independent); `setLocalPlayer` unchanged.
- `world.js`: state grows with `camera`, `rope`, `checkpoints`,
  `timeMs`, plus reserved inactive `grab`/`stamina` (phase 2).
- Removed over time: horizontal levels; touch pads stay, remapped
  to Bread/Fred.

## 3. Simulation: rope, camera, slopes

- Rope Verlet: 12 points; each frame, light gravity on free points,
  then ~8 constraint iterations: max 140/11 px between neighbours,
  ends pinned to players (rock + player in phase 2). When taut it
  drives players through the existing 50/50 + anchor rule; a
  hanging player keeps tangential momentum, giving free pendulum
  swing around an anchor with no extra code.
- Camera: y = players' vertical midpoint with upward lookahead
  while climbing, clamped to [0, 5000-540]. Fixed x (960-wide
  world). Exponential smoothing (~5/s). The 140 px rope keeps both
  players on screen.
- Snow slopes: authored as 8 px micro-steps in data, rendered
  smooth on top; the AABB engine climbs them untouched.
- Players: same body (36x40), gravity, jumps; head-boost jump kept
  for high passages. Speeds unchanged pending playtest.

## 4. Network: what syncs and what does not

- Never synced: the chain (re-simulated identically both ends
  from player positions — deterministic Verlet, same clamped dt),
  the camera (local only), particles.
- Synced: player snapshots extended with `grab`/`stamina`
  (reserved, zero in the slice, already in the schema so phase 2
  does not break the protocol again). Protocol bumped v1 to v2,
  `validSnapshot` hardened, CONTRACTS updated in the same commit.
- Prediction unchanged in principle: guest simulates its penguin
  locally, reconciles on 33 ms host snapshots; the local rope
  follows the prediction, so no visible stutter at 100 ms lag.
- Invite codes unchanged (offer + level; registry holds
  `mountain-1`).
- Accepted risk: two Verlet chains fed slightly different
  positions (prediction) diverge a little visually host vs guest.
  Cosmetic only; player positions stay authoritative.

## 5. Slice content and controls

- Level `mountain-1`: snow base (jump tutorial), 3 zones with
  gentle slopes, short vertical walls (jump + head-boost, no grab
  yet), 2 pits with platforms, 3 checkpoints, summit zone. Crate,
  switches, and gate are out of the slice (horizontal mechanics,
  re-evaluated in phase 2).
- Controls: Bread `Q`/`D` move, `Z` jump (`S` reserved for phase 2
  grab); Fred arrows (`Down` reserved). Matched by `e.code`
  (`KeyQ`, `KeyD`, `KeyZ`, `KeyS`) for AZERTY and QWERTY alike.
  Touch pads remapped to Bread/Fred, same shape.
- Out of slice: grab + 2.5 s stamina, Jeff rocks, moving
  platforms, rich victory screen, squash animations. `grab` and
  `stamina` fields already exist in state and snapshots.

## 6. HUD, states, tests

- HUD drawn on canvas: chrono on top (starts on first input,
  freezes at summit, `m:ss.c` format), checkpoint pips (3 empty
  to full). Nothing else in the slice.
- States: `menu` (unchanged + level picker holding `mountain-1`)
  to `play` to `won` (canvas overlay: time + `R` to replay).
  `R` mid-game resets world + chrono to zero. Falling below the
  world (y beyond 5000 + margin) respawns at the last checkpoint;
  the chrono keeps running.
- Tests: mirror `node:test` suites — `rope.test` (chain length
  kept, anchoring, pendulum), `camera.test` (midpoint following,
  bound clamps), `levels.test` (registry + 5000 px world +
  checkpoints), `snapshot.test` (v2 schema); existing Chromium E2E
  extended (host + join on `mountain-1`, both reach a high
  platform). No regression required on horizontal levels
  (removed).
- Slice success criteria: two keyboard players reach the summit
  locally, stable camera, visibly taut rope, same scenario online
  without desync, `npm test` green.
