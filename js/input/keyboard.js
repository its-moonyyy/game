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
    const k = typeof e.key === 'string' ? e.key.toLowerCase() : '';
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
    World.started = true;
    if (!e.repeat) {
      const i = keyOwner(k);
      if (localPlayer !== null && i !== localPlayer) return;   // owned by the remote side
      keys[k] = true;
      for (const p of World.players) {
        if (p.cfg.jump === k) p.jumpBuf = 0.15;   // queue a jump
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = typeof e.key === 'string' ? e.key.toLowerCase() : '';
    if (localPlayer === null || keyOwner(k) === localPlayer) {
      keys[k] = false;
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
  keys[p.cfg.jump] = !!input.jump;   // held state (rope climb reads it)
  if (input.jump && !p.remoteJumpHeld) p.jumpBuf = 0.15;  // rising edge only
  p.remoteJumpHeld = !!input.jump;
}
