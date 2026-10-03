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
  Game.resetWorld('mountain-1');

  const s = Game.getSnapshot();
  s.players[0].x = 440;
  s.players[0].y = 4900;
  s.players[1].x = 600;
  s.players[1].y = 4900;
  Game.applySnapshot(s);
  assert.ok(dist(s.players[0], s.players[1]) > 140, 'setup is taut');

  let t = 3000;
  for (let i = 0; i < 10; i++) {
    t += 16;
    frameFn(t);
  }
  const after = Game.getSnapshot();
  assert.ok(dist(after.players[0], after.players[1]) <= 141,
    'rope reels players back in');
});

test('grounded partner anchors instead of being dragged in', async () => {
  Game.resetWorld('mountain-1');
  const s = Game.getSnapshot();
  s.players[0].x = 440;
  s.players[0].y = 4900;
  s.players[1].x = 100;
  s.players[1].y = 4950;
  Game.applySnapshot(s);
  assert.ok(dist(s.players[0], s.players[1]) > 140, 'setup is taut');

  let t = 5000;
  for (let i = 0; i < 30; i++) {
    t += 16;
    frameFn(t);
  }
  const after = Game.getSnapshot();
  assert.ok(Math.abs(after.players[0].x - 440) < 5,
    'anchored partner holds the edge');
  assert.equal(after.players[0].y, 4900, 'partner never leaves the ledge');
});

test('dangling player climbs the rope by holding jump', async () => {
  Game.resetWorld('mountain-1');
  const s = Game.getSnapshot();
  s.players[0].x = 440;
  s.players[0].y = 4900;
  s.players[1].x = 100;
  s.players[1].y = 4950;
  Game.applySnapshot(s);
  assert.ok(dist(s.players[0], s.players[1]) > 140, 'climb setup is taut');
  Game.setRemoteInput(1, { left: false, right: false, jump: true });

  let t = 7000;
  for (let i = 0; i < 90; i++) {
    t += 16;
    frameFn(t);
  }
  const after = Game.getSnapshot();
  assert.ok(after.players[1].y < 4900, 'climber rises out of the void');
  assert.ok(Math.abs(after.players[0].x - 440) < 10,
    'anchor still holds while partner climbs');
  Game.setRemoteInput(1, { left: false, right: false, jump: false });
});

test('respawn gives regrouping grace instead of yanking', async () => {
  const { updateFallRespawn } = await import('../js/sim/rules.js');
  Game.resetWorld('mountain-1');
  const s = Game.getSnapshot();
  s.players[0].x = 100;
  s.players[0].y = 4780;
  s.players[1].x = 400;
  s.players[1].y = 5200;
  Game.applySnapshot(s);
  updateFallRespawn();
  const respawned = Game.getSnapshot();
  assert.ok(Math.abs(respawned.players[1].x - 520) < 5,
    'void fall respawns at spawn');

  let t = 9000;
  for (let i = 0; i < 10; i++) {
    t += 16;
    frameFn(t);
  }
  const after = Game.getSnapshot();
  assert.ok(Math.abs(after.players[0].x - 100) < 5,
    'partner is not yanked by a respawn');
  assert.ok(Math.abs(after.players[1].x - 520) < 5,
    'respawned player is not yanked either');
});
