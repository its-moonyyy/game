import assert from 'node:assert';

function makeEl() {
  return { hidden: false, textContent: '', value: '', handlers: {},
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
ids['viewport'].content = 'width=device-width, initial-scale=1';

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

global.window.Menu.show('game');
assert.match(ids['viewport'].content, /maximum-scale=1/,
  'game view locks viewport zoom');
global.window.Menu.show('menu');
assert.ok(!/maximum-scale/.test(ids['viewport'].content),
  'menu view restores viewport zoom');

ids['btn-host'].handlers.click();
await sleep(20);
global.window.Net.onOpen('host');
global.window.Net.onClose('host');
assert.equal(ids['net-overlay'].hidden, false,
  'guest drop shows host overlay');
assert.match(ids['net-overlay-text'].textContent, /waiting/,
  'overlay says waiting');
ids['btn-exit'].handlers.click();
assert.equal(ids['menu-view'].hidden, false, 'exit returns to menu');
assert.equal(ids['net-overlay'].hidden, true, 'exit hides overlay');

console.log('flow tests pass');
