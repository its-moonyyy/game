import assert from 'node:assert';

global.window = {};
await import('../net.js');
const T = global.window.Net._test;

assert.equal(T.snapshotIntervalMs, 33, 'snapshots run at 33ms');

const snap = { players: [{ x: 0, y: 0, vx: 100, vy: 0 },
  { x: 50, y: 50, vx: 0, vy: 0 }],
  block: { x: 0, y: 0, vy: 0 }, openAmt: 0,
  switches: [false, false], won: false };

const e100 = T.extrapolate(snap, 100);
assert.equal(e100.players[0].x, 10, 'extrapolates with velocity');
const e500 = T.extrapolate(snap, 500);
assert.equal(e500.players[0].x, 15, 'extrapolation clamps at 150ms');
assert.equal(e500.players[1].x, 50, 'still bodies stay put');

const near = T.reconcile({ x: 0, y: 0 }, { x: 10, y: 0 });
assert.ok(near.x > 0 && near.x < 10, 'near prediction blends');
const far = T.reconcile({ x: 0, y: 0 }, { x: 100, y: 0 });
assert.deepEqual(far, { x: 100, y: 0 }, 'far prediction snaps');

const local = JSON.parse(JSON.stringify(snap));
local.players[1].x = 50;
const server = JSON.parse(JSON.stringify(snap));
server.players[1].x = 44;
server.players[0].x = 80;
server.players[0].vx = 0;
server.players[0].dir = -1;
const m = T.mergePrediction(local, server, 33);
assert.equal(m.players[0].x, 80, 'P1 follows server');
assert.equal(m.players[0].dir, -1, 'P1 facing follows server');
assert.ok(Math.abs(m.players[1].x - 50) < 6, 'P2 keeps local prediction');
assert.deepEqual(m.switches, server.switches, 'switches follow server');

console.log('predict tests pass');
