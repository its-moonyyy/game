import assert from 'node:assert';

function makeEl() {
  return { hidden: false, textContent: '', value: '', handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; } };
}
const ids = {};
for (const id of ['menu-view', 'game-view', 'menu-status', 'btn-local',
  'btn-host', 'btn-join', 'btn-connect', 'invite-out', 'invite-in',
  'pad-p1', 'pad-p2']) {
  ids[id] = makeEl();
}
ids['game-view'].hidden = true;

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
const remoteInputs = [];
global.window.Game = {
  setSimEnabled() {},
  applySnapshot() {},
  setRemoteInput(i, input) { remoteInputs.push([i, input]); },
};
let joinImpl = async () => { throw new Error('invalid invite code'); };
global.window.Net = {
  async host() {
    return { code: 'CODE-A', connected: new Promise(() => {}) };
  },
  async join(code) { return joinImpl(code); },
  async confirm() {},
  onOpen: null,
  onClose: null,
};

await import('../menu.js');
const Menu = global.window.Menu;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

ids['btn-local'].handlers.click();
assert.equal(ids['game-view'].hidden, false, 'local shows game view');
assert.equal(mounts.length, 2, 'local mounts two pads');
assert.deepEqual(mounts[0].mapping, { left: 'a', right: 'd', jump: 'w' });
assert.deepEqual(mounts[1].mapping,
  { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' });

ids['game-view'].hidden = true;
ids['menu-view'].hidden = false;
mounts.length = 0;
ids['btn-host'].handlers.click();
await sleep(20);
assert.equal(ids['invite-out'].value, 'CODE-A', 'host shows invite code');
assert.match(ids['menu-status'].textContent, /waiting/,
  'host waits for guest');
global.window.Net.onOpen('host');
assert.equal(ids['game-view'].hidden, false, 'host enters game on open');
assert.equal(mounts.length, 1, 'host mounts one pad');
assert.deepEqual(mounts[0].mapping, { left: 'a', right: 'd', jump: 'w' });
global.window.Net.onClose('host');
assert.deepEqual(remoteInputs.at(-1),
  [1, { left: false, right: false, jump: false }],
  'guest drop releases P2 inputs');

ids['game-view'].hidden = true;
ids['menu-view'].hidden = false;
ids['btn-join'].handlers.click();
ids['invite-in'].value = '!!!';
ids['btn-connect'].handlers.click();
await sleep(20);
assert.match(ids['menu-status'].textContent, /invalid/,
  'bad code shows inline error');
assert.equal(ids['menu-view'].hidden, false, 'bad code stays on menu');

console.log('flow tests pass');
