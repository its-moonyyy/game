import { test } from 'node:test';
import assert from 'node:assert';
import { makeCtx } from './helpers.mjs';

test('snapshot round-trip, remote input, sim gate, local-player gate', async () => {
  let frameFn = null;
  const listeners = {};
  global.window = {
    addEventListener(type, fn) { listeners[type] = fn; },
  };
  global.document = {
    getElementById() { return { getContext: () => makeCtx() }; },
  };
  global.performance = { now: () => 1000 };
  global.requestAnimationFrame = (fn) => { frameFn = fn; };

  await import('../js/main.js');
  const Game = global.window.Game;
  assert.ok(Game, 'window.Game exists');

  const s0 = Game.getSnapshot();
  assert.equal(s0.players[0].x, 80, 'P1 starts at spawn x');
  assert.equal(s0.players[0].dir, 1, 'snapshot carries facing');
  assert.equal(s0.v, 1, 'snapshot carries protocol version');
  assert.equal(s0.level, 'level-1', 'snapshot carries level name');

  const moved = JSON.parse(JSON.stringify(s0));
  moved.players[0].x = 100;
  moved.players[0].dir = -1;
  Game.applySnapshot(moved);
  assert.equal(Game.getSnapshot().players[0].x, 100, 'restores P1 x');
  assert.equal(Game.getSnapshot().players[0].dir, -1, 'restores facing');

  Game.setRemoteInput(1, { left: true, right: false, jump: false });
  const before = Game.getSnapshot().players[1].x;
  frameFn(1016);
  frameFn(1032);
  const after = Game.getSnapshot().players[1].x;
  assert.ok(after < before, 'remote left input moves P2 left');

  const grounded = Game.getSnapshot();
  grounded.players[1].y = 470 - 40;
  grounded.players[1].vy = 0;
  Game.applySnapshot(grounded);
  Game.setRemoteInput(1, { left: false, right: false, jump: true });
  frameFn(1048);
  frameFn(1064);
  assert.ok(Game.getSnapshot().players[1].y < 470 - 40,
    'remote jump input lifts grounded P2');

  Game.setSimEnabled(false);
  const frozen = Game.getSnapshot().players[0].x;
  frameFn(1080);
  frameFn(1096);
  assert.equal(Game.getSnapshot().players[0].x, frozen,
    'disabled sim freezes positions');
  Game.setSimEnabled(true);

  const held = Game.getSnapshot();
  held.players[1].x = 160;
  held.players[1].y = 470 - 40;
  held.players[1].vy = 0;
  Game.applySnapshot(held);
  Game.setRemoteInput(1, { left: false, right: false, jump: false });
  let t = 2000;
  let landed = false;
  for (let i = 0; i < 200; i++) {
    Game.setRemoteInput(1, { left: false, right: false, jump: true });
    t += 16;
    frameFn(t);
    const s = Game.getSnapshot().players[1];
    if (s.y < 470 - 40) landed = true;
  }
  assert.ok(landed, 'held jump takes off once');
  const rest = Game.getSnapshot().players[1];
  assert.equal(rest.y, 470 - 40, 'held jump does not bunny-hop');

  Game.setLocalPlayer(0);
  const p2x = Game.getSnapshot().players[1].x;
  listeners.keydown({ key: 'ArrowLeft', repeat: false, preventDefault() {} });
  frameFn(t += 16);
  frameFn(t += 16);
  assert.equal(Game.getSnapshot().players[1].x, p2x,
    'host keyboard ignores guest keys');
  const p1x = Game.getSnapshot().players[0].x;
  listeners.keydown({ key: 'a', repeat: false, preventDefault() {} });
  frameFn(t += 16);
  frameFn(t += 16);
  assert.ok(Game.getSnapshot().players[0].x < p1x, 'host keeps own keys');
  listeners.keyup({ key: 'a' });
  Game.setLocalPlayer(null);
});
