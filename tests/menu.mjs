import assert from 'node:assert';

function makeEl() {
  return { hidden: false, textContent: '', handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; } };
}

const menuView = makeEl();
const gameView = makeEl();
gameView.hidden = true;
const statusEl = makeEl();
const hostBtn = makeEl();
const joinBtn = makeEl();
const localBtn = makeEl();

global.document = {
  getElementById(id) {
    return { 'menu-view': menuView, 'game-view': gameView,
      'menu-status': statusEl, 'btn-local': localBtn,
      'btn-host': hostBtn, 'btn-join': joinBtn,
      'btn-connect': makeEl(), 'invite-out': makeEl(),
      'invite-in': makeEl(), 'pad-p1': makeEl(),
      'pad-p2': makeEl(), 'viewport': makeEl(),
      'net-overlay': makeEl(), 'net-overlay-text': makeEl(),
      'btn-exit': makeEl() }[id] || null;
  },
  addEventListener() {},
};
global.window = {};

await import('../menu.js');

assert.ok(global.window.Menu, 'window.Menu exists');
global.window.Menu.show('game');
assert.equal(menuView.hidden, true, 'menu view hides');
assert.equal(gameView.hidden, false, 'game view shows');

let selected = null;
global.window.Menu.onSelect = (mode) => { selected = mode; };
hostBtn.handlers.click();
assert.equal(selected, 'host', 'host button selects host mode');

global.window.Menu.setStatus('waiting');
assert.equal(statusEl.textContent, 'waiting', 'status text set');

console.log('menu tests pass');
