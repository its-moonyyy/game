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
    }
  }
}

function collideGoal(p, goal) {
  return p.x < goal.x + goal.w && p.x + p.w > goal.x &&
         p.y < goal.y + goal.h && p.y + p.h > goal.y;
}
