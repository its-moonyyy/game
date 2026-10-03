import { test } from 'node:test';
import assert from 'node:assert';
import { makeDocument, makeWindow, ALL_IDS } from './helpers.mjs';

test('guest open applies queued snapshot as prediction base', async () => {
  const doc = makeDocument(ALL_IDS);
  const ids = doc.els;
  ids['game-view'].hidden = true;
  ids['net-overlay'].hidden = true;

  global.document = doc;
  global.window = makeWindow();

  const mounts = [];
  global.window.TouchPad = {
    mount(el, mapping, onChange) {
      mounts.push({ el, mapping, onChange });
      return true;
    },
  };
  const applied = [];
  global.window.Game = {
    simEnabled: true,
    setSimEnabled(on) { this.simEnabled = on; },
    setLocalPlayer() {},
    resetWorld() {},
    applySnapshot(s) { applied.push(JSON.parse(JSON.stringify(s))); },
  };

  await import('../js/net/peer.js');
  await import('../js/ui/menu.js');

  const fixture = { v: 2,
    players: [{ x: 11, y: 22, vx: 0, vy: 0, grab: false, stamina: 0 },
      { x: 33, y: 44, vx: 0, vy: 0, grab: false, stamina: 0 }],
    block: { x: 1, y: 2, vy: 0 }, openAmt: 0.5,
    switches: [true, false], won: false };
  global.window.Net._test.injectState(fixture);
  assert.equal(applied.length, 0, 'nothing applied before ready');

  global.window.Net.onOpen('guest');
  assert.equal(ids['game-view'].hidden, false, 'guest enters game view');
  assert.deepEqual(applied, [], 'wiring leaves P2 to prediction');
  assert.deepEqual(global.window.Net._test.latest(), fixture,
    'queued snapshot becomes prediction base');
  assert.equal(mounts.length, 1, 'guest mounts one pad');
  assert.deepEqual(mounts[0].mapping,
    { left: 'arrowleft', right: 'arrowright', jump: 'arrowup' });
});
