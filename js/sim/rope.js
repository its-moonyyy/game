// Consumes: nothing (pure Verlet integration)
// Produces: createRope(n), stepRope(rope, ax, ay, bx, by, maxLen),
//   ROPE_SEGMENTS, ROPE_LEN

export const ROPE_SEGMENTS = 12;
export const ROPE_LEN = 140;
const RELAX_ITERATIONS = 100;
const POINT_GRAVITY = 900;   // px/s^2 on free points (visual sag only)
const STEP_DT = 1 / 60;

export function createRope(n) {
  const points = [];
  for (let i = 0; i < n; i++) points.push({ x: 0, y: 0, px: 0, py: 0 });
  return { points };
}

function pin(rope, ax, ay, bx, by) {
  const first = rope.points[0];
  first.x = ax; first.y = ay; first.px = ax; first.py = ay;
  const last = rope.points[rope.points.length - 1];
  last.x = bx; last.y = by; last.px = bx; last.py = by;
}

export function stepRope(rope, ax, ay, bx, by, maxLen) {
  const seg = maxLen / (rope.points.length - 1);
  pin(rope, ax, ay, bx, by);
  for (const p of rope.points) {
    const nx = p.x + (p.x - p.px);
    const ny = p.y + (p.y - p.py) + POINT_GRAVITY * STEP_DT * STEP_DT;
    p.px = p.x;
    p.py = p.y;
    p.x = nx;
    p.y = ny;
  }
  pin(rope, ax, ay, bx, by);
  for (let k = 0; k < RELAX_ITERATIONS; k++) {
    pin(rope, ax, ay, bx, by);
    for (let i = 0; i < rope.points.length - 1; i++) {
      const a = rope.points[i], b = rope.points[i + 1];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      if (d === 0) continue;
      const diff = (d - seg) / d;
      const firstPinned = i === 0;
      const lastPinned = i + 1 === rope.points.length - 1;
      if (firstPinned && lastPinned) continue;
      if (firstPinned) {
        b.x -= dx * diff;
        b.y -= dy * diff;
      } else if (lastPinned) {
        a.x += dx * diff;
        a.y += dy * diff;
      } else {
        a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
        b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
      }
    }
  }
  pin(rope, ax, ay, bx, by);
}
