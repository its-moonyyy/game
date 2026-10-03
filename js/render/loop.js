// Consumes: World (jump buffer decay), sim/* (updates), render/draw.js
// Produces: update(dt), setSimEnabled(bool) (guest prediction pauses sim)

import { World } from '../world.js';
import { updatePlayers, updateBlock } from '../sim/physics.js';
import { updateSwitches, updateWin, updateCheckpoints, updateFallRespawn,
  updateSummit, updateChrono } from '../sim/rules.js';
import { updateParts, burst } from '../sim/particles.js';
import { stepRope } from '../sim/rope.js';
import { updateCamera } from './camera.js';
import { cam, rope } from './view.js';
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
  if (World.level.h) {
    updateCheckpoints();
    updateFallRespawn();
    updateSummit();
    updateChrono(dt);
    if (World.won) {
      World.winT += dt;
      const goal = World.level.goal;
      if (World.winT < 3.2 && World.parts.length < 420) {
        burst(goal.x + goal.w / 2, goal.y + goal.h / 2, 8);
      }
    }
  } else {
    updateBlock(dt);
    updateSwitches(dt);
    updateWin(dt);
  }
  updateParts(dt);
  const [a, b] = World.players;
  const maxLen = World.level.rope || 140;
  stepRope(rope, a.x + a.w / 2, a.y + a.h / 2,
    b.x + b.w / 2, b.y + b.h / 2, maxLen);
  updateCamera(cam, a, b, dt, World.level.h || 540);
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
