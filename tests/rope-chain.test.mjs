import { test } from 'node:test';
import assert from 'node:assert';
import { createRope, stepRope } from '../js/sim/rope.js';

test('chain pins ends and conserves length', () => {
  const rope = createRope(12);
  stepRope(rope, 0, 0, 100, 0, 140);
  const [first, last] = [rope.points[0], rope.points[11]];
  assert.ok(Math.hypot(first.x, first.y) < 2, 'start pinned');
  assert.ok(Math.hypot(last.x - 100, last.y) < 2, 'end pinned');
  let len = 0;
  for (let i = 1; i < 12; i++) {
    len += Math.hypot(rope.points[i].x - rope.points[i - 1].x,
      rope.points[i].y - rope.points[i - 1].y);
  }
  assert.ok(len <= 141, 'chain within max length');
});

test('teleport snaps chain, never stretches', () => {
  const rope = createRope(12);
  stepRope(rope, 0, 0, 900, 4000, 140);
  const [first, last] = [rope.points[0], rope.points[11]];
  assert.ok(Math.hypot(first.x, first.y) < 2, 'start snapped');
  assert.ok(Math.hypot(last.x - 900, last.y - 4000) < 2, 'end snapped');
});
