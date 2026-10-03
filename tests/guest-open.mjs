import assert from 'node:assert';

function makeEl() {
  return { hidden: false, textContent: '', value: '', innerHTML: '',
    handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; } };
}
const ids = {};
for (const id of ['menu-view', 'game-view', 'menu-status', 'btn-local',
  'btn-host', 'btn-join', 'btn-connect', 'invite-out', 'invite-in',
  'pad-p1', 'pad-p2', 'viewport', 'net-overlay', 'net-overlay-text',
  'btn-exit']) {
  ids[id] = makeEl();
}
ids['game-view'].hidden = true;
ids['net-overlay'].hidden = true;

global.document = {
  getElementById(id) { return ids[id] || null; },
  addEventListener() {},
};
global.window = {};

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
  applySnapshot(s) { applied.push(JSON.parse(JSON.stringify(s))); },
};

await import('../net.js');
await import('../menu.js');

const fixture = { players: [{ x: 11, y: 22, vx: 0, vy: 0 },
  { x: 33, y: 44, vx: 0, vy: 0 }],
  block: { x: 1, y: 2, vy: 0 }, openAmt: 0.5,
  switches: [true, false], won: false };
global.window.Net._test.injectState(fixture);
assert.equal(applied.length, 0, 'nothing applied before ready');

global.window.Net.onOpen('guest');
assert.equal(ids['game-view'].hidden, false, 'guest enters game view');
assert.deepEqual(applied.at(-1), fixture,
  'queued snapshot applied on guest open');
assert.equal(mounts.length, 1, 'guest mounts one pad');
assert.deepEqual(mounts[0].mapping,
  { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' });

console.log('guest-open tests pass');
