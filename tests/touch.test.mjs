import { test } from 'node:test';
import assert from 'node:assert';

function makeButton() {
  return { textContent: '', listeners: {},
    addEventListener(type, fn, opts) {
      (this.listeners[type] ||= []).push({ fn, opts });
    } };
}

test('touch pad with keyboard parity and multi-touch', async () => {
  const buttons = [makeButton(), makeButton(), makeButton()];
  const container = { children: [],
    appendChild(b) { this.children.push(b); } };

  global.window = { ontouchstart: null };
  Object.defineProperty(global, 'navigator',
    { value: { maxTouchPoints: 1 }, configurable: true });
  global.document = {
    createElement() { return buttons[container.children.length]; },
  };

  const { keys } = await import('../js/input/keyboard.js');
  const { World } = await import('../js/world.js');
  await import('../js/input/touch.js');
  assert.ok(global.window.TouchPad, 'window.TouchPad exists');

  const changes = [];
  const ok = global.window.TouchPad.mount(container,
    { left: 'q', right: 'd', jump: 'z' },
    (input) => { changes.push({ ...input }); });
  assert.equal(ok, true, 'mount returns true on touch device');
  assert.equal(container.children.length, 3, 'three buttons created');

  function fire(btn, type, touches) {
    for (const { fn, opts } of btn.listeners[type]) {
      if (type === 'touchstart') {
        assert.equal(opts.passive, false, 'touchstart is non-passive');
      }
      fn({ preventDefault() {}, changedTouches: touches });
    }
  }

  fire(buttons[0], 'touchstart', [{ identifier: 1 }]);
  assert.equal(keys.q, true, 'left press sets keys.q');
  assert.equal(World.started, true, 'touch press starts the chrono');
  assert.deepEqual(changes.at(-1), { left: true, right: false, jump: false });

  fire(buttons[1], 'touchstart', [{ identifier: 2 }]);
  fire(buttons[0], 'touchend', [{ identifier: 1 }]);
  assert.equal(keys.q, false, 'left release clears keys.q');
  assert.equal(keys.d, true, 'right finger still held');

  fire(buttons[2], 'touchstart', [{ identifier: 3 }]);
  assert.equal(World.players[0].jumpBuf, 0.15, 'jump buffers like keyboard');
});
