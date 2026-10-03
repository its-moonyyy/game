import { test } from 'node:test';
import assert from 'node:assert';
import { makeCtx } from './helpers.mjs';

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

test('rope pulls distant players together on roped levels', async () => {
  let frameFn = null;
  global.document = {
    getElementById() { return { getContext: () => makeCtx() }; },
  };
  global.window = {};
  global.performance = { now: () => 1000 };
  global.requestAnimationFrame = (fn) => { frameFn = fn; };

  await import('../js/main.js');
  const Game = global.window.Game;
  Game.resetWorld('level-4');

  const s = Game.getSnapshot();
  s.players[0].x = 100;
  s.players[1].x = 400;
  Game.applySnapshot(s);
  assert.ok(dist(s.players[0], s.players[1]) > 220, 'setup is taut');

  let t = 3000;
  for (let i = 0; i < 10; i++) {
    t += 16;
    frameFn(t);
  }
  const after = Game.getSnapshot();
  assert.ok(dist(after.players[0], after.players[1]) <= 221,
    'rope reels players back in');

  Game.resetWorld('level-1');
  const s2 = Game.getSnapshot();
  s2.players[0].x = 100;
  s2.players[1].x = 500;
  Game.applySnapshot(s2);
  for (let i = 0; i < 10; i++) {
    t += 16;
    frameFn(t);
  }
  const free = Game.getSnapshot();
  assert.ok(dist(free.players[0], free.players[1]) > 300,
    'unroped levels leave players alone');
  Game.resetWorld('level-1');
});
