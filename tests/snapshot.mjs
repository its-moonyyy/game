import assert from 'node:assert';

function makeCtx() {
  return new Proxy({}, { get(t, p) {
    if (p === 'createLinearGradient') {
      return () => ({ addColorStop() {} });
    }
    if (typeof p === 'string') return (...args) => undefined;
    return undefined;
  }, set() { return true; } });
}

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

await import('../game.js');
const Game = global.window.Game;
assert.ok(Game, 'window.Game exists');

const s0 = Game.getSnapshot();
assert.equal(s0.players[0].x, 80, 'P1 starts at spawn x');

const moved = JSON.parse(JSON.stringify(s0));
moved.players[0].x = 100;
Game.applySnapshot(moved);
assert.equal(Game.getSnapshot().players[0].x, 100, 'snapshot restores P1 x');

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

console.log('snapshot tests pass');
