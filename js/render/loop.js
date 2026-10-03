// Consumes: World (jump buffer decay), sim/* (updates), render/draw.js
// Produces: update(dt), setSimEnabled(bool) (guest prediction pauses sim)

import { World } from '../world.js';
import { updatePlayers, updateBlock } from '../sim/physics.js';
import { updateSwitches, updateWin } from '../sim/rules.js';
import { updateParts } from '../sim/particles.js';
import { renderAll } from './draw.js';

let simEnabled = true;   // guest mode never disables this anymore,
// prediction reconciles instead; kept for tests and pause menus
let last = performance.now();

/* =========================================================
   Main update
   ========================================================= */
export function update(dt) {
  for (const p of World.players) p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  updatePlayers(dt);
  updateBlock(dt);
  updateSwitches(dt);
  updateWin(dt);
  updateParts(dt);
}

export function setSimEnabled(on) {
  simEnabled = !!on;
}

/* =========================================================
   Game loop (requestAnimationFrame)
   ========================================================= */
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);  // clamp long frames
  last = now;
  if (simEnabled) update(dt);
  renderAll();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
