// Consumes: Config (GRAV, GROUND), World (live state)
// Produces: burst(x, y, n), updateParts(dt) (cosmetic only)

import { GRAV, GROUND } from '../config.js';
import { World } from '../world.js';

export function burst(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 160;
    World.parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      life: 0.7 + Math.random() * 0.8,
      col: ['#ffe066', '#8ff0a4', '#ff6b6b', '#66d9ff', '#ffffff'][i % 5],
      size: 3 + Math.random() * 5,
    });
  }
}

export function updateParts(dt) {
  for (const p of World.parts) {
    p.vy += GRAV * 0.7 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.y > GROUND) { p.y = GROUND; p.vy *= -0.4; p.vx *= 0.7; }
  }
  World.parts = World.parts.filter(p => p.life > 0);
}
