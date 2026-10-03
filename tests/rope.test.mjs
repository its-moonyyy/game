import { test } from 'node:test';
import assert from 'node:assert';
import { makeCtx } from './helpers.mjs';

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

let frameFn = null;
global.document = {
  getElementById() { return { getContext: () => makeCtx() }; },
};
global.window = {};
global.performance = { now: () => 1000 };
global.requestAnimationFrame = (fn) => { frameFn = fn; };

await import('../js/main.js');
const Game = global.window.Game;

test('rope pulls distant players together on roped levels', async () => {
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

test('grounded partner anchors instead of being dragged in', async () => {
  Game.resetWorld('level-4');
  const s = Game.getSnapshot();
  s.players[0].x = 480;
  s.players[0].y = 430;
  s.players[1].x = 200;
  s.players[1].y = 580;
  Game.applySnapshot(s);
  assert.ok(dist(s.players[0], s.players[1]) > 220, 'setup is taut');

  let t = 5000;
  for (let i = 0; i < 30; i++) {
    t += 16;
    frameFn(t);
  }
  const after = Game.getSnapshot();
  assert.ok(Math.abs(after.players[0].x - 480) < 5,
    'anchored partner holds the edge');
  assert.equal(after.players[0].y, 430, 'partner never leaves the ledge');
  Game.resetWorld('level-1');
});

test('dangling player climbs the rope by holding jump', async () => {  Game.resetWorld('level-4');
  const s = Game.getSnapshot();
  s.players[0].x = 480;
  s.players[0].y = 430;
  s.players[1].x = 200;
  s.players[1].y = 580;
  Game.applySnapshot(s);
  assert.ok(dist(s.players[0], s.players[1]) > 220, 'climb setup is taut');
  Game.setRemoteInput(1, { left: false, right: false, jump: true });

  let t = 7000;
  for (let i = 0; i < 90; i++) {
    t += 16;
    frameFn(t);
  }
  const after = Game.getSnapshot();
  assert.ok(after.players[1].y < 520, 'climber rises out of the depths');
  assert.ok(Math.abs(after.players[0].x - 480) < 10,
    'anchor still holds while partner climbs');
  Game.setRemoteInput(1, { left: false, right: false, jump: false });
  Game.resetWorld('level-1');
});

test('respawn gives regrouping grace instead of yanking', async () => {
  Game.resetWorld('level-4');
  const s = Game.getSnapshot();
  s.players[0].x = 480;
  s.players[0].y = 430;
  s.players[1].x = 200;
  s.players[1].y = 580;
  Game.applySnapshot(s);

  let t = 9000;
  for (let i = 0; i < 45; i++) {
    t += 16;
    frameFn(t);
  }
  const fallen = Game.getSnapshot();
  assert.ok(Math.abs(fallen.players[1].x - 110) < 5,
    'faller respawned at spawn');
  for (let i = 0; i < 10; i++) {
    t += 16;
    frameFn(t);
  }
  const after = Game.getSnapshot();
  assert.ok(Math.abs(after.players[0].x - 480) < 5,
    'partner is not yanked by a respawn');
  assert.ok(Math.abs(after.players[1].x - 110) < 5,
    'respawned player is not yanked either');
  Game.resetWorld('level-1');
});
