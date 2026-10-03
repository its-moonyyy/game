# Design: Touch Gamepad + Online Multiplayer (Co-op Capers)

Date: 2026-10-03
Status: approved in chat (4/4 sections), pending spec review

## 1. Goal

Add touchscreen controls and real-time 2-player online play to the
Co-op Capers canvas game, fronted by a mode-select menu. Constraints:
vanilla JS only, HTML/CSS/JS kept in separate files, static hosting
on GitHub Pages (no server), English only.

## 2. Architecture and files

The simulation in `game.js` stays authoritative and untouched in its
physics. New code wraps around it:

- `index.html` — two views: a menu view (title, Same screen / Host
  game / Join game buttons, invite-code boxes with help text) and the
  existing game view (canvas). The menu shows first; the game view
  unhides on start.
- `touch.js` (new) — on-screen pad (left, right, jump) feeding the
  existing `keys` mechanism. Same-screen mode mounts two pads (P1 on
  the left half, P2 on the right half). Online mode mounts one pad for
  the local player. Pads render only on touch devices (`pointer:
  coarse` media plus touch detection); desktop is unchanged.
- `net.js` (new) — WebRTC peer connection with a data channel and
  manual invite-code signaling (base64url SDP, copy-paste, no server,
  no third party). Host receives guest inputs and broadcasts compact
  snapshots at 20 Hz. Guest sends inputs and renders snapshots with
  light interpolation instead of simulating.
- `game.js` (hooks only) — expose `getSnapshot()` / `applySnapshot()`
  and a remote-input injection point into the existing `keys` and
  jump-buffer path. No physics changes.
- `style.css` — menu and gamepad styling.

## 3. Data flow

Only the authority simulates.

- Same screen: pad P1 drives the WASD `keys` slots, pad P2 drives the
  arrow slots, then the local `update(dt)` and draw run as today.
  Keyboard keeps working alongside the pads.
- Host (online): host pad/keyboard drives P1; guest inputs arriving
  over the data channel drive P2 with jump-buffering preserved. The
  host runs `update(dt)`, draws locally, and broadcasts a snapshot
  30 times per second (both players' position and velocity, crate
  position and velocity, gate `openAmt`, switch states, win flags;
  about 200 bytes of JSON).
- Guest (online): the local pad sends `{left, right, jump}` plus a
  sequence number on every input change and on a 33 Hz heartbeat.
  The guest runs its own simulation for immediate feedback and
  reconciles it against host snapshots arriving at 33 Hz: P1, the
  crate, switches, and flags follow the server (positions
  extrapolated by velocity and age, clamped at 150 ms), while P2
  keeps its locally predicted position, blending toward the server
  when close and snapping when diverged by more than 36 px. The
  guest's own player therefore reacts within a frame instead of a
  full round trip; the menu help text still notes the residual lag.
- Invite-code flow: Host game creates an offer and shows CODE-A. Join
  game pastes CODE-A and shows CODE-B. The host pastes CODE-B, the
  channel opens, and both sides enter the game view automatically.

## 4. Connection states and error handling

Menu states: `idle`, `waiting-for-guest` (host), `connecting`
(guest), `connected`, `in-game`, `disconnected`, `error`. Every state
has explicit menu text; nothing hangs silently.

- Bad invite code: validated on paste (base64 shape plus SDP marker);
  invalid input shows an inline error and stays on the menu.
- Guest drops mid-game: the host releases all P2 inputs, shows a
  "guest disconnected, waiting" overlay, and keeps the host game alive
  so a fresh code pair can resume it.
- Host drops: the guest shows "host left" with a back-to-menu button.
  No auto-retry loops.
- Channel hygiene: messages are JSON with a `type` field; unknown
  types and malformed frames are ignored so a stray paste never
  crashes the loop.

## 5. Testing and verification

- `node --check` on every JS file; local serve plus curl of all assets
  expecting HTTP 200.
- Keyboard-parity test: every pad button must produce the identical
  `keys` entries as its keyboard twin.
- Online sync test: two tabs on one machine, codes pasted between
  them; the guest canvas must mirror host positions and a completed
  level must register `won` on both ends.
- Regression: desktop keyboard-only play behaves exactly as today (no
  pads rendered, no channel opened, loop untouched).
- Real-phone touch check is done by the owner on the live Pages URL
  (no touch-capable browser exists in this environment).
