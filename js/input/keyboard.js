// Consumes: World (players for keyOwner/remote input)
// Produces: keys, setLocalPlayer(i|null|-1), setRemoteInput(i, input)

import { World } from '../world.js';

export const keys = {};
let localPlayer = null;   // null = every player reads the keyboard (same screen)

function keyOwner(key) {
  for (let i = 0; i < World.players.length; i++) {
    const c = World.players[i].cfg;
    if (c.left === key || c.right === key || c.jump === key) return i;
  }
  return -1;
}

if (typeof window !== 'undefined' &&
  typeof window.addEventListener === 'function') {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    if (!e.repeat) {
      const i = keyOwner(e.key);
      if (localPlayer !== null && i !== localPlayer) return;   // owned by the remote side
      keys[e.key] = true;
      for (const p of World.players) {
        if (p.cfg.jump === e.key) p.jumpBuf = 0.15;   // queue a jump
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    if (localPlayer === null || keyOwner(e.key) === localPlayer) {
      keys[e.key] = false;
    }
  });
  window.addEventListener('blur', () => {
    for (const k in keys) {
      if (localPlayer === null || keyOwner(k) === localPlayer) keys[k] = false;
    }
  });
}

export function setLocalPlayer(i) {
  localPlayer = (i === null || i === undefined) ? null : i;
}

export function setRemoteInput(i, input) {
  const p = World.players[i];
  keys[p.cfg.left] = !!input.left;
  keys[p.cfg.right] = !!input.right;
  if (input.jump && !p.remoteJumpHeld) p.jumpBuf = 0.15;  // rising edge only
  p.remoteJumpHeld = !!input.jump;
}
