import { test } from 'node:test';
import assert from 'node:assert';
import { makeCtx, makeDocument, ALL_IDS } from './helpers.mjs';
import { World } from '../js/world.js';

let frameFn = null;
const keyDown = [];
const doc = makeDocument(ALL_IDS);
global.document = doc;
global.window = {
  addEventListener(type, fn) { if (type === 'keydown') keyDown.push(fn); },
};
global.performance = { now: () => 1000 };
global.requestAnimationFrame = (fn) => { frameFn = fn; };

await import('../js/main.js');
const { updateCheckpoints, updateFallRespawn, updateSummit,
  updateChrono } = await import('../js/sim/rules.js');
const Game = global.window.Game;

const press = (key) => {
  for (const fn of keyDown) fn({ key, repeat: false, preventDefault() {} });
};
let simT = 10000;
const step = (n = 2) => {
  for (let i = 0; i < n; i++) {
    simT += 16;
    frameFn(simT);
  }
};

test('mountain rules: checkpoints, summit, chrono, fall, reset', async () => {
  Game.resetWorld('mountain-1');
  doc.els['game-view'].hidden = false;

  let snap = Game.getSnapshot();
  assert.ok(snap.checkpoints.every((c) => !c.hit), 'checkpoints start open');

  let t = 10000;
  const step = (n = 2) => { for (let i = 0; i < n; i++) { t += 16; frameFn(t); } };
  step();
  assert.equal(Game.getSnapshot().timeMs, 0, 'chrono idle before input');
  press('d');
  step(2);
  assert.ok(Game.getSnapshot().timeMs > 0, 'chrono runs after input');

  snap = Game.getSnapshot();
  snap.players[0].x = 760;
  snap.players[0].y = 3900;
  Game.applySnapshot(snap);
  updateCheckpoints();
  assert.ok(Game.getSnapshot().checkpoints[0].hit, 'touch activates it');

  snap = Game.getSnapshot();
  snap.players[0].x = 480;
  snap.players[0].y = 100;
  Game.applySnapshot(snap);
  updateSummit();
  assert.equal(Game.getSnapshot().won, false, 'one player is not enough');

  snap = Game.getSnapshot();
  snap.players[1].x = 500;
  snap.players[1].y = 100;
  Game.applySnapshot(snap);
  updateSummit();
  assert.equal(Game.getSnapshot().won, true, 'both in summit win');
  const frozen = Game.getSnapshot().timeMs;
  updateChrono(16);
  updateChrono(16);
  assert.equal(Game.getSnapshot().timeMs, frozen, 'chrono freezes on win');
  assert.equal(World.winT, 0, 'win effects start at zero');
  step(10);
  assert.ok(World.winT > 0, 'win flash advances on mountain');
  Game.resetRun();
  snap = Game.getSnapshot();
  assert.equal(snap.timeMs, 0, 'reset zeroes chrono');
  snap.players[0].x = 760;
  snap.players[0].y = 3900;
  Game.applySnapshot(snap);
  updateCheckpoints();
  snap = Game.getSnapshot();
  snap.players[1].x = 400;
  snap.players[1].y = 5200;
  Game.applySnapshot(snap);
  updateFallRespawn();
  snap = Game.getSnapshot();
  assert.ok(snap.players[1].y < 5080, 'void fall respawns');
  assert.ok(Math.abs(snap.players[1].x - 760) < 5, 'respawn at checkpoint');
  assert.ok(snap.players[1].y > 3800, 'respawn near last checkpoint');

  snap = Game.getSnapshot();
  snap.players[0].x = 100;
  Game.applySnapshot(snap);
  press('r');
  snap = Game.getSnapshot();
  assert.equal(snap.players[0].x, 440, 'R restarts the run');
  assert.equal(snap.timeMs, 0, 'R zeroes the chrono');
});

test('loop branches on world height, not checkpoint presence', async () => {
  Game.resetWorld('mountain-1');
  World.level = { ...World.level, h: undefined, checkpoints: [] };
  World.block = { x: 400, y: 100, w: 40, h: 40, vy: 0 };
  step(5);
  assert.ok(World.block.y > 100, 'old levels run block physics');
  Game.resetWorld('mountain-1');
});
