import { test } from 'node:test';
import assert from 'node:assert';
import { makeDocument, ALL_IDS } from './helpers.mjs';

test('mountain render uses camera translate and HUD chrono', async () => {
  const calls = [];
  const ctx = new Proxy({}, {
    get(t, p) {
      if (p === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (typeof p === 'string') {
        return (...args) => { calls.push([p, ...args]); };
      }
      return undefined;
    },
    set() { return true; },
  });
  let frameFn = null;
  const keyDown = [];
  const doc = makeDocument(ALL_IDS);
  doc.els.game = { getContext: () => ctx };
  global.document = doc;
  global.window = {
    addEventListener(type, fn) { if (type === 'keydown') keyDown.push(fn); },
  };
  global.performance = { now: () => 1000 };
  global.requestAnimationFrame = (fn) => { frameFn = fn; };

  await import('../js/main.js');
  const Game = global.window.Game;
  Game.resetWorld('mountain-1');
  for (const fn of keyDown) {
    fn({ key: 'd', repeat: false, preventDefault() {} });
  }

  let t = 20000;
  for (let i = 0; i < 70; i++) {
    t += 16;
    frameFn(t);
  }
  const translated = calls.filter((c) => c[0] === 'translate');
  assert.ok(translated.length > 0, 'camera translate applied');
  const camY = -translated.at(-1)[2];
  assert.ok(camY > 4000, 'camera sits low on the mountain at spawn');
  const texts = calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
  assert.ok(texts.some((s) => /\d+:\d\d\.\d/.test(s)), 'HUD shows chrono');
  Game.resetWorld('level-1');
});
