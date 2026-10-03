# Touch Gamepad + Online Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mode-select menu, touchscreen gamepads, and host-authoritative WebRTC online play to Co-op Capers.

**Architecture:** `game.js` keeps the single authoritative `update(dt)` + draw loop. `menu.js` switches between menu and game views. `touch.js` feeds the existing `keys` map. `net.js` syncs guest inputs up and host snapshots down over a data channel. Small hooks in `game.js` expose snapshots and remote input.

**Tech Stack:** Vanilla JS, HTML, CSS. No dependencies. WebRTC `RTCPeerConnection` + `RTCDataChannel` (browser-native).

**Spec:** `docs/superpowers/specs/2026-10-03-touch-gamepad-online-multiplayer-design.md`

## Global Constraints

- Separate HTML, CSS, JS — no inline `<style>` and no inline game code in `index.html`.
- Code and UI copy in English only.
- Respect existing indentation (2 spaces in JS/CSS; flat top-level tags in `index.html` as today).
- Static hosting: no server, no fetch calls, no third-party signaling.

## Review Focus

- Two thumbs on one pad (multi-touch): each button tracks its own touch id; lifting one finger must not release the other button.
- Page scroll/zoom while playing: touch handlers call `preventDefault()` (non-passive listeners) and the viewport meta stays `maximum-scale=1, user-scalable=no` only on the game view.
- Snapshot arriving before the guest game view exists: `net.js` queues the latest snapshot until `applySnapshot` is ready, then applies once.
- User pastes their own code back or the same code twice: paste validation rejects it with an inline error, no state change.
- Host on keyboard plus guest on touch at the same time: both input paths write the same `keys` slots with jump-buffering preserved for each.

---

### Task 1: Mode-select menu view

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Create: `menu.js`
- Test: `tests/menu.mjs` (node, no DOM: stub minimal `document` for view toggling)

**Interfaces:**
- Consumes: nothing.
- Produces: `window.Menu.show(view)` where view is `'menu'` or `'game'`; `window.Menu.onSelect = fn(mode)` with mode in `'local'`, `'host'`, `'join'`; `window.Menu.setStatus(text)` for connection-state text.

- [ ] **Step 1: Write the failing test**

```js
// tests/menu.mjs
import assert from 'node:assert';
// stub document/window, import ../menu.js, assert Menu.show('game')
// hides #menu-view and unhides #game-view, and onSelect fires with 'host'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/menu.mjs`
Expected: FAIL with "menu.js not defined" (file does not exist yet)

- [ ] **Step 3: Implement `window.Menu` in `menu.js`, add menu markup to `index.html`, menu styles to `style.css`**

Menu markup: title, three buttons (Same screen, Host game, Join game), invite-code textarea + paste box, status line, help text noting guest input lags about one round trip. Game view keeps canvas exactly as today.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/menu.mjs`
Expected: PASS

- [ ] **Step 5: Serve and curl both views' assets**

Run: `python3 -m http.server 8901 & curl -s http://localhost:8901/index.html | grep -c 'menu-view'` then kill server
Expected: `1` (markup present), HTTP 200 for `menu.js`

- [ ] **Step 6: Commit**

```bash
git add index.html style.css menu.js tests/menu.mjs
git commit -m "feat: add mode-select menu view"
```

### Task 2: Touch gamepad feeding keyboard slots

**Files:**
- Create: `touch.js`
- Modify: `style.css` (pad styles, `pointer: coarse` visibility)
- Test: `tests/touch.mjs` (node with DOM stub: buttons, touch events)

**Interfaces:**
- Consumes: the shared `keys` object and jump-buffer convention from `game.js` (key-down sets `keys[key] = true` and `jumpBuf = 0.15` for the matching player).
- Produces: `window.TouchPad.mount(el, mapping, onChange)` where mapping is `{left, right, jump}` key names; `onChange(input)` fires on every change with `{left, right, jump}` booleans (used by the online guest path); each button tracks its own touch id; `mount` is a no-op returning `false` on non-touch devices.

- [ ] **Step 1: Write the failing test**

```js
// tests/touch.mjs
import assert from 'node:assert';
// stub touch environment, mount pad with {left:'a',right:'d',jump:'w'}
// assert touchstart on left sets keys.a true; second finger on right keeps
// keys.a true after left finger lifts (multi-touch); jump sets jumpBuf 0.15
// assert touchstart listener registered with {passive:false} (no scroll)
// assert onChange fires with {left:true,right:false,jump:false}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/touch.mjs`
Expected: FAIL with "touch.js not defined"

- [ ] **Step 3: Implement `window.TouchPad.mount(el, mapping)` in `touch.js`**

Left/right/jump buttons with `touchstart`/`touchend`/`touchcancel` bound per touch id, non-passive listeners with `preventDefault()`. Same keyboard-parity values as the spec's Review Focus line 1.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/touch.mjs`
Expected: PASS

- [ ] **Step 5: Syntax check**

Run: `node --check touch.js`
Expected: no output (clean)

- [ ] **Step 6: Commit**

```bash
git add touch.js style.css tests/touch.mjs
git commit -m "feat: add touch gamepad with keyboard parity"
```

### Task 3: Snapshot hooks in game.js

**Files:**
- Modify: `game.js`
- Test: `tests/snapshot.mjs` (node: stub `document`, `performance`, `requestAnimationFrame`; load `game.js`; move a player; round-trip snapshot)

**Interfaces:**
- Consumes: existing state (`players`, `block`, `openAmt`, `SWITCHES`, `won`).
- Produces: `window.Game.getSnapshot()` returning `{players:[{x,y,vx,vy}], block:{x,y,vy}, openAmt, switches:[bool,bool], won}`; `window.Game.applySnapshot(s)` restoring exactly those fields; `window.Game.setRemoteInput(playerIndex, input)` writing `keys` slots plus jump-buffering for that player; `window.Game.setSimEnabled(bool)` toggling whether the rAF loop runs `update(dt)` (guest disables simulation but keeps drawing).

- [ ] **Step 1: Write the failing test**

```js
// tests/snapshot.mjs
import assert from 'node:assert';
// load game.js under stubs, set P1 x=100, snap = Game.getSnapshot()
// mutate state, Game.applySnapshot(snap), assert P1 x back at 100
// setRemoteInput(1, {left:true}) asserts arrow-slot key true
// setRemoteInput(1, {jump:true}) asserts P2 jumpBuf is 0.15
// setSimEnabled(false) then frame step asserts P1 x unchanged
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/snapshot.mjs`
Expected: FAIL with "Game.getSnapshot is not a function"

- [ ] **Step 3: Implement `window.Game` hooks in `game.js` without touching physics**

Append-only section at the end of `game.js`; no changes to `update`, collision, or draw functions.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/snapshot.mjs`
Expected: PASS

- [ ] **Step 5: Regression — desktop loop untouched**

Run: `node --check game.js && git diff --stat game.js`
Expected: clean syntax; diff shows only the appended hooks section

- [ ] **Step 6: Commit**

```bash
git add game.js tests/snapshot.mjs
git commit -m "feat: add snapshot and remote-input hooks"
```

### Task 4: WebRTC netcode with invite codes

**Files:**
- Create: `net.js`
- Test: `tests/netcode.mjs` (node: pure code validation + snapshot wire round-trip through `Game.applySnapshot` stub)

**Interfaces:**
- Consumes: `window.Game.getSnapshot`, `window.Game.applySnapshot`, `window.Game.setRemoteInput`, `window.Menu.setStatus`.
- Produces: `window.Net.host()` resolving `{code}` (CODE-A); `window.Net.join(codeA)` resolving `{code}` (CODE-B); `window.Net.confirm(codeB)` opening the channel; `window.Net.sendInput(input)`; `window.Net.onState = fn(snapshot)`; guest keeps the last two snapshots and runs its own rAF lerping positions between them by render timestamp, calling `applySnapshot` each frame; snapshots arriving before the game view is ready are queued with only the latest kept; invite codes are base64url with an `eyJ` (JSON) marker so own-code paste-back is rejected.

- [ ] **Step 1: Write the failing test**

```js
// tests/netcode.mjs
import assert from 'node:assert';
// assert encodeInvite({sdp:'x'}) starts with eyJ and decodeInvite rejects
// own marker; assert snapshot JSON fixture survives stringify/parse with
// all fields from Task 3 present; assert guest queue keeps only the latest
// snapshot while not ready, then delivers it once on ready
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/netcode.mjs`
Expected: FAIL with "net.js not defined"

- [ ] **Step 3: Implement `window.Net` in `net.js`**

Host: `createOffer` → CODE-A; on `confirm(CODE-B)` set remote description; data channel `inputs` (guest→host, input-change + 20 Hz heartbeat with sequence numbers) and snapshots (host→guest, 20 Hz via `getSnapshot`). Guest: `setRemoteDescription(CODE-A)` → CODE-B answer; `onState` applies latest snapshot, queueing until the game view is ready. Unknown `type` values and malformed frames are ignored.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/netcode.mjs`
Expected: PASS

- [ ] **Step 5: Manual two-tab check (owner-assisted or headless if available)**

Serve locally, open host + guest tabs, paste codes between them; guest canvas mirrors host; completing the level sets `won` on both ends.

- [ ] **Step 6: Commit**

```bash
git add net.js tests/netcode.mjs
git commit -m "feat: add host-authoritative webrtc netcode"
```

### Task 5: Wire-up, error states, deploy

**Files:**
- Modify: `index.html` (script tags for `menu.js`, `touch.js`, `net.js` before `game.js`)
- Modify: `menu.js` (state machine `idle/waiting-for-guest/connecting/connected/in-game/disconnected/error`, overlay texts, host-drop/guest-drop handling)
- Test: manual checklist below

**Interfaces:**
- Consumes: all Tasks 1–4 interfaces.
- Produces: working menu → same-screen/host/join flows; guest-drop overlay freezes P2 inputs; host-drop returns guest to menu.

- [ ] **Step 1: Wire script tags and role startup**

Same-screen: mount two pads (P1 WASD slots left, P2 arrow slots right). Host: one pad on P1 + `Net.host()`. Guest: one pad whose `onChange` calls `Net.sendInput`, `Game.setSimEnabled(false)`, `Net.join(codeA)` → inputs drive `sendInput`.

- [ ] **Step 2: Error-state checklist**

Bad code paste → inline error, stays on menu. Guest drop → P2 frozen overlay on host. Host drop → guest "host left" + back-to-menu. Unknown channel message → ignored, loop alive.

- [ ] **Step 3: Full verification**

Run: `node --check` on all JS; serve + curl all five assets for 200; two-tab sync check from Task 4 Step 5.

- [ ] **Step 4: Push and confirm Pages rebuild**

Run: `git push game main` then `gh api repos/its-moonyyy/game/pages/builds/latest --jq '{status, commit}'`
Expected: `built` on the new commit; live URL serves the menu as first view.

- [ ] **Step 5: Commit**

```bash
git add index.html menu.js
git commit -m "feat: wire menu, pads, and netcode flows"
```
