// Consumes: Config (GROUND), World (live state)
// Produces: updateSwitches(dt), updateWin(dt) (called by render/loop.js)

import { H, GROUND } from '../config.js';
import { World } from '../world.js';
import { burst } from './particles.js';

export function updateSwitches(dt) {
  for (const s of World.switches) {
    s.pressed = World.players.some(p =>
      p.gnd && p.y + p.h >= GROUND - 10 &&
      p.x < s.x + s.w && p.x + p.w > s.x);
  }

  const held = World.switches.some(s => s.pressed);
  if (held) {
    World.grace = 0.45;
    World.openAmt = Math.min(1, World.openAmt + dt * 2.2);
  } else if (World.grace > 0) World.grace -= dt;
  else World.openAmt = Math.max(0, World.openAmt - dt * 2.2);   // close after the grace window
}

export function updateWin(dt) {
  const goal = World.level.goal;
  if (!World.won && World.players.every(p => collideGoal(p, goal))) {
    World.won = true;
    World.winT = 0;
  }
  if (World.won) {
    World.winT += dt;
    if (World.winT < 3.2 && World.parts.length < 420) {
      burst(goal.x + goal.w / 2, goal.y + goal.h / 2, 8);
    }
  }
  for (const p of World.players) {
    if (p.y > H + 80) {     // fell into the depths -> respawn
      const spawn = World.level.spawn[World.players.indexOf(p)];
      p.x = spawn.x; p.y = spawn.y;
      p.vx = 0; p.vy = 0;
      p.ropeHold = 45;   // regrouping grace: the rope won't yank anyone
    }
  }
}

function collideGoal(p, goal) {
  return p.x < goal.x + goal.w && p.x + p.w > goal.x &&
         p.y < goal.y + goal.h && p.y + p.h > goal.y;
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

export function updateCheckpoints() {
  for (const c of World.checkpoints) {
    if (!c.hit && World.players.some((p) => overlap(p, cpZone(c)))) {
      c.hit = true;
    }
  }
}

function cpZone(c) {
  return { x: c.x - 20, y: c.y - 20, w: 40, h: 40 };
}

function lastCheckpoint() {
  const hit = World.checkpoints.filter((c) => c.hit);
  return hit.length > 0 ? hit[hit.length - 1] : null;
}

export function updateFallRespawn() {
  const floor = (World.level.h || H) + 80;
  for (const p of World.players) {
    if (p.y > floor) {
      const cp = lastCheckpoint();
      if (cp) {
        p.x = cp.x; p.y = cp.y - p.h;
      } else {
        const spawn = World.level.spawn[World.players.indexOf(p)];
        p.x = spawn.x; p.y = spawn.y;
      }
      p.vx = 0; p.vy = 0;
      p.ropeHold = 45;   // regrouping grace: the rope won't yank anyone
    }
  }
}

export function updateSummit() {
  const goal = World.level.goal;
  if (!World.won && World.players.every((p) => collideGoal(p, goal))) {
    World.won = true;
    World.winT = 0;
  }
}

export function updateChrono(dt) {
  if (World.started && !World.won) World.timeMs += dt * 1000;
}
