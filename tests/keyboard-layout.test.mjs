import { test } from 'node:test';
import assert from 'node:assert';
import { keyCfgs, setKeyLayout, keyLayout } from '../js/config.js';
import { makeCtx } from './helpers.mjs';

test('keyboard layouts switch Bread bindings', () => {
  setKeyLayout('azerty');
  assert.equal(keyLayout(), 'azerty');
  assert.deepEqual(keyCfgs()[0], { left: 'q', right: 'd', jump: 'z' });
  setKeyLayout('qwerty');
  assert.equal(keyLayout(), 'qwerty');
  assert.deepEqual(keyCfgs()[0], { left: 'a', right: 'd', jump: 'w' });
  assert.deepEqual(keyCfgs()[1],
    { left: 'arrowleft', right: 'arrowright', jump: 'arrowup' });
  setKeyLayout('nope');
  assert.equal(keyLayout(), 'qwerty', 'unknown layout keeps current');
  setKeyLayout('azerty');
});

test('qwerty layout drives movement with a/d/w', async () => {
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
  setKeyLayout('qwerty');
  Game.resetWorld('mountain-1');
  Game.setLocalPlayer(0);

  const x0 = Game.getSnapshot().players[0].x;
  listeners.keydown({ key: 'q', repeat: false, preventDefault() {} });
  let t = 40000;
  frameFn(t += 16);
  frameFn(t += 16);
  assert.equal(Game.getSnapshot().players[0].x, x0, 'q is dead in qwerty');
  listeners.keyup({ key: 'q' });
  listeners.keydown({ key: 'a', repeat: false, preventDefault() {} });
  frameFn(t += 16);
  frameFn(t += 16);
  assert.ok(Game.getSnapshot().players[0].x < x0, 'a moves left in qwerty');
  listeners.keyup({ key: 'a' });
  Game.setLocalPlayer(null);
  setKeyLayout('azerty');
});
