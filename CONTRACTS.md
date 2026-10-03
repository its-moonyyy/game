# Contracts

Single source of truth for every cross-file agreement in this game.
Start here before any change. Rule: if you change anything described
in this file, update this file in the same commit.

## Snapshot protocol (host -> guest, JSON, ~200 bytes, 30 Hz)

- `v`: number, currently `1`. Guests reject any other version.
- `players`: exactly 2 x `{x, y, vx, vy, dir}` (numbers; `dir` is -1/1).
- `block`: `{x, y, vy}` (numbers).
- `openAmt`: number 0..1. `switches`: exactly 2 booleans.
- `won`: boolean.

## Channel messages (JSON, `{type, ...}`)

- Guest -> host: `{type: 'input', seq, input: {left, right, jump}}`
  on every change plus a 33 ms heartbeat. Unknown `type` values and
  malformed frames are ignored, never crash the loop.
- Host -> guest: `{type: 'state', snap}` at 33 ms.
- Invite codes: base64url JSON `{type: 'offer'|'answer', sdp, id}`
  starting with `eyJ`. Offers also carry `level` (the host's pick);
  the guest loads it on join. Own codes (matching a locally created
  `id`) are rejected, as is the wrong `type` for the slot.

## Input slots

- P1 (host-owned): `a` / `d` / `w`. P2 (guest-owned): arrows.
- The built-in keyboard only writes the local player's slots
  (`Game.setLocalPlayer`: `0` host, `-1` guest, `null` same screen).
- Guest pads and guest keys both end in `Net.sendInput`; the host
  applies them via `Game.setRemoteInput(1, input)` with rising-edge
  jump (holding jump never re-buffers).

## window.Game facade (owned by render/loop.js, the only public seam)

- `getSnapshot()` / `applySnapshot(s)` — `applySnapshot` skips
  `dir` when absent and never touches input state. Snapshots carry
  `level` (informational; authority stays with the invite).
- `setRemoteInput(i, input)`, `setSimEnabled(bool)`,
  `setLocalPlayer(i|null|-1)`, `resetWorld(name)` (unknown names
  fall back to level-1).

## Levels (`js/levels/`)

- Pure data files plus one registry entry in `js/levels/index.js`.
  New level = new file + entry; menu buttons render from the
  registry, no menu edit needed.

## DOM IDs touched by JS

- Views: `menu-view`, `game-view` (`show()` also toggles the
  `viewport` meta between full and locked).
- Menu: `btn-local`, `btn-host`, `btn-join`, `btn-connect`,
  `btn-copy`, `btn-paste`, `invite-out`, `invite-in`, `menu-status`.
- Game: `game` (canvas), `pad-p1`, `pad-p2`, `net-overlay`,
  `net-overlay-text`, `btn-exit`.

## Tuning knobs (js/config.js)

Canvas and physics constants live in exactly one place with units
in comments. Netcode cadence: `SNAP_MS` in js/net/sync.js.

## File headers

Every `js/` file starts with:
`// Consumes: ...` / `// Produces: ...`
An agent should need only the target file plus this document.
