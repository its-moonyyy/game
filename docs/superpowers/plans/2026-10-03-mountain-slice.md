# Mountain Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the horizontal game with the playable mountain vertical slice: rope chain, camera, mountain-1, remapped controls, checkpoints/chrono/summit, v2 snapshots, menu boot, E2E.

**Architecture:** Keep the module skeleton and facades; swap sim/render/level content. The rope chain is derived state re-simulated both ends (never synced); camera is local-only; snapshots gain only `grab`/`stamina` (zero in slice).

**Tech Stack:** Vanilla JS ES modules, HTML, CSS. No dependencies. WebRTC (existing).

**Spec:** `docs/superpowers/specs/2026-10-03-mountain-rope-design.md`

## Global Constraints

- Separate HTML, CSS, JS vanilla, no inline game code.
- Code and UI copy in English only.
- 2-space indentation, no tabs.
- Static hosting: no server, no fetch calls, no third-party signaling.
- Every task ends with `npm test` green before committing.

## Review Focus

- Rope ends detach on teleport/respawn: after `resetWorld` or checkpoint respawn, the chain must snap to the new player positions on the next step, never stretch across the map. Pinned by Task 1's test (teleport then step, assert ends within 2 px of players).
- Camera with a dangling player far below: midpoint plunges; clamping must hold and the view must never show outside [0, WORLD_H]. Pinned by Task 2's clamp test.
- AZERTY labels vs key positions: Bread uses the Q/D/Z/S labels, so match `e.key` lowercased (`'q'`, `'d'`, `'z'`, `'s'`), NOT `e.code` (spec §5 names e.code, which binds the wrong physical keys on AZERTY — this plan corrects the spec). Pinned by Task 4's test (keydown `{key: 'd'}` moves P1; `{code: 'KeyD'}` alone does nothing).
- Mixed-version sessions: a v2 host with a stale v1 guest means the guest rejects every snapshot and freezes with no message. Pinned by Task 7's rejection test; forehead note, no UI added.
- Summit rule: `won` requires BOTH players inside the summit zone (consistent with the old goal rule; the spec is silent, this plan decides). Pinned by Task 5's test (one player in zone does not win).

---

### Task 1: Rope chain sim

**Files:**
- Create: `js/sim/rope.js`
- Create: `tests/rope-chain.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `createRope(n)` returning `{points: [{x, y}]}`; `stepRope(rope, ax, ay, bx, by, maxLen)` pinning ends then relaxing 8 iterations with segment length `maxLen / (n - 1)`; `ROPE_SEGMENTS = 12`, `ROPE_LEN = 140`.

- [ ] **Step 1: Write the failing test**

```js
// tests/rope-chain.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import { createRope, stepRope } from '../js/sim/rope.js';
test('chain pins ends and conserves length', () => {
  const rope = createRope(12);
  stepRope(rope, 0, 0, 100, 0, 140);
  const [first, last] = [rope.points[0], rope.points[11]];
  assert.ok(Math.hypot(first.x, first.y) < 2, 'start pinned');
  assert.ok(Math.hypot(last.x - 100, last.y) < 2, 'end pinned');
  let len = 0;
  for (let i = 1; i < 12; i++) {
    len += Math.hypot(rope.points[i].x - rope.points[i-1].x,
      rope.points[i].y - rope.points[i-1].y);
  }
  assert.ok(len <= 141, 'chain within max length');
});
test('teleport snaps chain, never stretches', () => {
  const rope = createRope(12);
  stepRope(rope, 0, 0, 900, 4000, 140);
  const [first, last] = [rope.points[0], rope.points[11]];
  assert.ok(Math.hypot(first.x, first.y) < 2, 'start snapped');
  assert.ok(Math.hypot(last.x - 900, last.y - 4000) < 2, 'end snapped');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rope-chain.test.mjs`
Expected: FAIL with "Cannot find module '../js/sim/rope.js'"

- [ ] **Step 3: Implement `createRope`, `stepRope`, `ROPE_SEGMENTS`, `ROPE_LEN` in `js/sim/rope.js`**

Verlet points with light gravity on free points; pin ends to (ax, ay)/(bx, by) before AND after the 8 relax iterations (the double pin is what makes teleport snap).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rope-chain.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/sim/rope.js tests/rope-chain.test.mjs
git commit -m "feat: verlet rope chain sim"
```

### Task 2: Camera

**Files:**
- Create: `js/render/camera.js`
- Create: `tests/camera.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `createCamera()` returning `{y: 0}`; `updateCamera(cam, p1, p2, dt, worldH)` setting `cam.y` to smoothed midpoint with upward lookahead, clamped to `[0, worldH - 540]`; `CAM_SMOOTH = 5`, `CAM_LOOKAHEAD = 120`.

- [ ] **Step 1: Write the failing test**

```js
// tests/camera.test.mjs (expects: follows midpoint, clamps, converges)
const cam = createCamera();
updateCamera(cam, {x: 0, y: 4800}, {x: 0, y: 4700}, 1, 5000);
assert.ok(Math.abs(cam.y - 4210) < 400, 'near midpoint minus lookahead');
updateCamera(cam, {x: 0, y: 100}, {x: 0, y: 100}, 10, 5000);
assert.equal(cam.y, 0, 'clamped at top');
updateCamera(cam, {x: 0, y: 4950}, {x: 0, y: 4950}, 10, 5000);
assert.equal(cam.y, 4460, 'clamped at bottom');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/camera.test.mjs`
Expected: FAIL with "Cannot find module '../js/render/camera.js'"

- [ ] **Step 3: Implement `createCamera`, `updateCamera`, `CAM_SMOOTH`, `CAM_LOOKAHEAD` in `js/render/camera.js`**

Target = (p1.y + p2.y) / 2 - 270 - CAM_LOOKAHEAD when climbing (target below current), plain midpoint otherwise; exponential approach `cam.y += (target - cam.y) * Math.min(1, CAM_SMOOTH * dt)`; clamp last.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/camera.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/render/camera.js tests/camera.test.mjs
git commit -m "feat: midpoint camera with lookahead"
```

### Task 3: Mountain level data

**Files:**
- Create: `js/levels/mountain-1.js`
- Modify: `js/levels/index.js`
- Modify: `tests/levels.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `LevelMountain1` with `{name: 'mountain-1', title, h: 5000, solid, gate: null, switches: [], goal (summit zone), spawn, blockStart: null, rope: 140, checkpoints: [{x, y}]}`; `Levels.list()` includes it.

- [ ] **Step 1: Extend the levels test**

Add to `tests/levels.test.mjs`: mountain-1 builds (2 spawns near the base y > 4800), `h` is 5000, exactly 3 checkpoints inside bounds, summit `goal` within top 200 px, every solid inside 960 width, max vertical gap between standable surfaces ≤ 130.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (mountain-1 missing from registry)

- [ ] **Step 3: Create `js/levels/mountain-1.js`, register in `js/levels/index.js`**

Layout constraints: platforms every ≤ 130 vertical px (jump reaches 146); pits ≤ 200 wide; one head-boost gap (tall wall, no crate); checkpoints at y ≈ 3800 / 2600 / 1400 near wide ledges; summit goal `{x: 0, y: 0, w: 960, h: 200}`; spawn y ≈ 4930 on the base; `rope: 140`, `gate: null`, `switches: []`, `blockStart: null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all suites green)

- [ ] **Step 5: Commit**

```bash
git add js/levels/mountain-1.js js/levels/index.js tests/levels.test.mjs
git commit -m "feat: mountain-1 vertical level data"
```

### Task 4: Controls remap (Bread/Fred, e.key)

**Files:**
- Modify: `js/config.js` (CFG)
- Modify: `js/input/keyboard.js` (match `e.key` lowercased)
- Modify: `js/ui/menu.js` (P1_MAP/P2_MAP key names)
- Modify: `tests/snapshot.test.mjs`, `tests/flow.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: CFG `[{left: 'q', right: 'd', jump: 'z'}, {left: 'arrowleft', right: 'arrowright', jump: 'arrowup'}]` matched case-insensitively against `e.key`; pads use the same names.

- [ ] **Step 1: Update the tests to the new bindings**

In `tests/snapshot.test.mjs`: key events become `{key: 'd'}` (P1 moves right) and `{key: 'ArrowLeft'}` (was already arrow-named; change to lowercase `'arrowleft'` to pin case-insensitivity). In `tests/flow.test.mjs`: P1 pad mapping becomes `{left: 'q', right: 'd', jump: 'z'}`, P2 pad `{left: 'arrowleft', right: 'arrowright', jump: 'arrowup'}`; guest keyboard sends on `{key: 'ArrowRight'}` (e.key form still works mixed-case).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL (old bindings no longer match)

- [ ] **Step 3: Implement the remap in `js/config.js`, `js/input/keyboard.js`, `js/ui/menu.js`**

Lowercase `e.key` once per event (`const k = e.key.toLowerCase()`), compare against CFG. Update P1_MAP/P2_MAP and the guest GUEST_KEYS map identically. Prevent-default list uses the same lowercase names.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/config.js js/input/keyboard.js js/ui/menu.js tests/snapshot.test.mjs tests/flow.test.mjs
git commit -m "feat: bread/fred controls on e.key"
```

### Task 5: Rules (checkpoints, fall, summit, chrono, R)

**Files:**
- Modify: `js/world.js` (fields)
- Modify: `js/sim/rules.js` (new rule fns)
- Modify: `js/render/loop.js` (call them, chrono tick)
- Modify: `js/ui/menu.js` (R key to `Game.resetRun`)
- Modify: `js/main.js` (`Game.resetRun`)
- Test: `tests/rules.test.mjs`

**Interfaces:**
- Consumes: world fields `checkpoints [{x,y,hit}]`, `timeMs`, `started`, `summit {x,y,w,h}` (summit lives in level `goal`).
- Produces: `Game.resetRun()` (world back to current level, chrono zero); `updateRules(dt)` internal to loop (checkpoint touch activates, y beyond level.h + 80 respawns at last hit checkpoint, both players in goal sets `won` and freezes chrono, chrono ticks only when started and not won).

- [ ] **Step 1: Write the failing test**

```js
// tests/rules.test.mjs (import main.js like snapshot.test.mjs)
Game.resetWorld('mountain-1');
// touch first checkpoint area -> hit true
// teleport one player into summit -> won still false
// teleport both into summit -> won true, timeMs frozen across frames
// move a player below level.h + 80 -> respawns at last hit checkpoint
// Game.resetRun() -> timeMs 0, players at spawn
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rules.test.mjs`
Expected: FAIL (`Game.resetRun is not a function` or checkpoint fields missing)

- [ ] **Step 3: Implement world fields, rule fns, loop wiring, R key, `Game.resetRun`**

Checkpoint radius 40. Respawn keeps velocity zeroed and sets `ropeHold` 45 (existing grace). Summit test mirrors the old goal test but requires both players. R: menu keydown listener (`k === 'r'`, any mode while in game view) calls `Game.resetRun()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/world.js js/sim/rules.js js/render/loop.js js/ui/menu.js js/main.js tests/rules.test.mjs
git commit -m "feat: checkpoints, summit, chrono, restart"
```

### Task 6: Mountain rendering + HUD

**Files:**
- Modify: `js/render/draw.js`
- Modify: `js/render/loop.js` (camera update + rope step per frame)

**Interfaces:**
- Consumes: `createCamera/updateCamera`, `createRope/stepRope`, `renderAll` existing shape fns (replaced).
- Produces: `renderAll()` drawing with `ctx.translate(0, -cam.y)`: sky gradient, snow platforms with caps, vertical walls, rope polyline through chain points, two penguins (white body, black back, orange beak, facing by `dir`), HUD chrono `m:ss.c` top-center + 3 checkpoint pips; victory overlay text when `won` (time + "press R").

- [ ] **Step 1: Write the failing test**

```js
// tests/render.test.mjs (canvas stub recording translate/fillText calls)
import main, step one frame on mountain-1, assert the stub saw
ctx.translate called with (0, -cam.y) where cam.y >= 0,
and fillText saw a string matching /\d+:\d\d\.\d/.
```

To make HUD text reachable, `drawHUD` reads `World.timeMs`/`checkpoints`/`won` and calls `ctx.fillText`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/render.test.mjs`
Expected: FAIL (no translate/HUD in old draw)

- [ ] **Step 3: Implement camera+rope stepping in `loop.js`, mountain drawing + HUD in `draw.js`**

Per frame: update players/block/switches/win/parts (existing), step rope chain from player centers, update camera, `renderAll` with translate. Rope drawn as polyline through all 12 points. Penguins reuse the rr-body + eyes pattern with a beak triangle. Keep `drawPlayer` name or rename to `drawPenguin` (update callers).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/render/draw.js js/render/loop.js tests/render.test.mjs
git commit -m "feat: mountain rendering, camera, HUD"
```

### Task 7: Netcode v2 (grab/stamina reserved)

**Files:**
- Modify: `js/world.js` (player fields)
- Modify: `js/net/sync.js` (`validSnapshot`)
- Modify: `js/net/peer.js` (nothing unless names change)
- Modify: `CONTRACTS.md` (protocol v2 section)
- Modify: `tests/snapshot.test.mjs`, `tests/netcode.test.mjs`, `tests/predict.test.mjs`

**Interfaces:**
- Consumes: `World.players[i].grab` (bool), `.stamina` (number, init 0).
- Produces: snapshots carry `v: 2`, per-player `grab` + `stamina`; `validSnapshot` requires `v === 2` plus grab boolean and stamina number; `applySnapshot` restores both (same pattern as `dir`).

- [ ] **Step 1: Update the tests to v2**

Fixtures gain `v: 2`, `grab: false`, `stamina: 0`; assert `getSnapshot()` emits them; assert a v1 snapshot is now rejected; assert missing grab/stamina is rejected.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL (emits v1 without new fields)

- [ ] **Step 3: Implement player fields, snapshot v2, validation, CONTRACTS update**

Same commit updates CONTRACTS.md protocol section (v2 schema, rejection rule).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/world.js js/net/sync.js CONTRACTS.md tests/snapshot.test.mjs tests/netcode.test.mjs tests/predict.test.mjs
git commit -m "feat: snapshot protocol v2 with reserved grab/stamina"
```

### Task 8: Boot, cleanup, E2E

**Files:**
- Modify: `js/levels/index.js` (mountain only), delete `js/levels/level-1.js`, `level-2.js`, `level-3.js`, `level-4.js`
- Modify: `tests/levels.test.mjs`, `tests/rope.test.mjs`, `tests/flow.test.mjs` (level-row now 1 button, title Mountain), `index.html` (title beat), `README.md` (controls)
- Modify: `tests/e2e/two-peer.mjs` (mountain flow)

**Interfaces:**
- Consumes: all previous tasks.
- Produces: menu boots on `mountain-1`; `?level=` still works; E2E passes on the mountain.

- [ ] **Step 1: Update tests to the mountain-only registry**

`levels.test` expects `['mountain-1']`; `flow.test` clicks the single level button; `rope.test` retargets its distance-rope cases to `mountain-1` (which carries `rope: 140`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL (old levels missing)

- [ ] **Step 3: Delete old levels, shrink registry, update index/README/menu default**

Registry becomes `{current: mountain, get: () => mountain, list: [mountain]}` (keep the shape for phase 2). Menu default level `mountain-1`. README documents Bread/Fred controls.

- [ ] **Step 4: Extend E2E and run everything**

E2E: menu → same-screen on mountain-1 → move P1 right (x increases) → `applySnapshot` P1 near summit → `won` true → camera.y small. Run: `npm test` then the E2E file (needs CDP; skips cleanly without).

- [ ] **Step 5: Commit**

```bash
git add js/levels tests/levels.test.mjs tests/rope.test.mjs tests/flow.test.mjs tests/e2e/two-peer.mjs index.html README.md
git commit -m "feat: mountain-only boot with E2E"
```

## Self-Review

- Spec coverage: rope (T1+T6), camera (T2+T6), level (T3), controls (T4), rules/HUD/states (T5+T6), net v2 (T7), boot/E2E (T8). Spec §2 `render/camera.js`, `sim/rope.js`, registry, `e.code`, reserved fields all have tasks. Covered.
- Step scan: each step names one action with exact names/values; test code carries spec values (12 points, 140 px, 8 iterations, 5000 px, 33 ms unchanged, `m:ss.c`, 45-frame grace untouched).
- Type consistency: `createRope/stepRope`, `createCamera/updateCamera(cam, p1, p2, dt, worldH)`, `Levels.list()` `{name,title}`, `Game.resetRun()`, snapshot `{v, level, players[{x,y,vx,vy,dir,grab,stamina}], block, openAmt, switches, won}`. Consistent throughout.
- Review Focus: all five lines have owning tests (T1 teleport, T2 clamp, T4 e.key, T7 v1 rejection, T5 both-required).
- Proportion: 8 tasks for a full vertical slice; code blocks only where signatures alone underdetermine (rope/camera/loops tests). Plan, not transcript.
