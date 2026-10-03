import { test } from 'node:test';
import assert from 'node:assert';
import { makeDocument, makeWindow, sleep, ALL_IDS } from './helpers.mjs';

test('menu flows: local, host, join errors, viewport, overlay, clipboard, guest keys', async () => {
  const doc = makeDocument(ALL_IDS);
  const ids = doc.els;
  ids['game-view'].hidden = true;
  ids['net-overlay'].hidden = true;
  ids['viewport'].content = 'width=device-width, initial-scale=1';

  global.document = doc;
  global.window = makeWindow();
  const clipboard = { written: null, toRead: 'PASTED-CODE',
    async writeText(t) { this.written = t; },
    async readText() { return this.toRead; } };
  Object.defineProperty(global, 'navigator',
    { value: { clipboard }, configurable: true });

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
    setLocalPlayer() {},
    resetWorld(name) { resets.push(name); },
    setRemoteInput(i, input) { remoteInputs.push([i, input]); },
  };
  let joinImpl = async () => { throw new Error('invalid invite code'); };
  const sentInputs = [];
  const resets = [];
  let hostLevel = null;
  global.window.Net = {
    async host(level) {
      hostLevel = level;
      return { code: 'CODE-A', connected: new Promise(() => {}) };
    },
    async join(code) { return joinImpl(code); },
    async confirm() {},
    sendInput(input) { sentInputs.push({ ...input }); },
    ready() {},
    onState: null,
    onOpen: null,
    onClose: null,
  };

  await import('../js/ui/menu.js');

  ids['btn-local'].handlers.click();
  assert.equal(ids['game-view'].hidden, false, 'local shows game view');
  assert.equal(mounts.length, 2, 'local mounts two pads');
  assert.deepEqual(mounts[0].mapping, { left: 'q', right: 'd', jump: 'z' });
  assert.deepEqual(mounts[1].mapping,
    { left: 'arrowleft', right: 'arrowright', jump: 'arrowup' });

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
  assert.deepEqual(mounts[0].mapping, { left: 'q', right: 'd', jump: 'z' });
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

  ids['invite-out'].value = 'CODE-A';
  ids['btn-copy'].handlers.click();
  await sleep(20);
  assert.equal(clipboard.written, 'CODE-A', 'copy writes invite code');
  ids['btn-paste'].handlers.click();
  await sleep(20);
  assert.equal(ids['invite-in'].value, 'PASTED-CODE', 'paste fills the box');
  clipboard.writeText = async () => { throw new Error('denied'); };
  ids['btn-copy'].handlers.click();
  await sleep(20);
  assert.match(ids['menu-status'].textContent, /manually/,
    'blocked copy falls back to manual');

  const levelBtns = ids['level-row'].children;
  assert.equal(levelBtns.length, 5, 'five level buttons');
  levelBtns[1].handlers.click();
  assert.match(ids['menu-status'].textContent, /High Wall/,
    'level select shows title');
  assert.equal(ids['level-row'].children[1].disabled, true,
    'selected level disabled');
  ids['btn-host'].handlers.click();
  await sleep(20);
  assert.equal(hostLevel, 'level-2', 'host offers selected level');

  joinImpl = async () => ({ code: 'CODE-B', level: 'level-2' });
  ids['invite-in'].value = 'CODE-A';
  ids['btn-join'].handlers.click();
  ids['btn-connect'].handlers.click();
  await sleep(20);
  assert.ok(resets.includes('level-2'), 'guest loads host level');
  global.window.Net.onOpen('guest');
  global.window.keyHandlers.keydown(
    { key: 'ArrowRight', repeat: false, preventDefault() {} });
  assert.deepEqual(sentInputs.at(-1),
    { left: false, right: true, jump: false },
    'guest keyboard sends input');
  global.window.keyHandlers.keyup({ key: 'ArrowRight' });
  assert.deepEqual(sentInputs.at(-1),
    { left: false, right: false, jump: false },
    'guest key release sends input');
  global.window.keyHandlers.keydown(
    { key: 'a', repeat: false, preventDefault() {} });
  assert.deepEqual(sentInputs.at(-1),
    { left: false, right: false, jump: false },
    'guest ignores non-guest keys');
});
