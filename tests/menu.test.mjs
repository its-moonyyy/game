import { test } from 'node:test';
import assert from 'node:assert';
import { makeDocument } from './helpers.mjs';

test('menu view toggling, selection, and status', async () => {
  const doc = makeDocument(['menu-view', 'game-view', 'menu-status',
    'btn-local', 'btn-host', 'btn-join', 'btn-connect', 'invite-out',
    'invite-in', 'pad-p1', 'pad-p2', 'viewport', 'net-overlay',
    'net-overlay-text', 'btn-exit', 'btn-copy', 'btn-paste', 'level-row', 'btn-layout-azerty', 'btn-layout-qwerty']);
  global.document = doc;
  global.window = {};
  doc.els['game-view'].hidden = true;

  await import('../js/ui/menu.js');

  assert.ok(global.window.Menu, 'window.Menu exists');
  global.window.Menu.show('game');
  assert.equal(doc.els['menu-view'].hidden, true, 'menu view hides');
  assert.equal(doc.els['game-view'].hidden, false, 'game view shows');

  let selected = null;
  global.window.Menu.onSelect = (mode) => { selected = mode; };
  doc.els['btn-host'].handlers.click();
  assert.equal(selected, 'host', 'host button selects host mode');

  global.window.Menu.setStatus('waiting');
  assert.equal(doc.els['menu-status'].textContent, 'waiting',
    'status text set');
});

test('late Net arrival gets hooked', async () => {
  const doc = makeDocument(['menu-view', 'game-view', 'menu-status',
    'btn-local', 'btn-host', 'btn-join', 'btn-connect', 'invite-out',
    'invite-in', 'pad-p1', 'pad-p2', 'viewport', 'net-overlay',
    'net-overlay-text', 'btn-exit', 'btn-copy', 'btn-paste', 'level-row', 'btn-layout-azerty', 'btn-layout-qwerty']);
  global.document = doc;
  global.window = {};
  const { hookNet } = await import('../js/ui/menu.js');
  assert.equal(global.window.Net, undefined, 'no Net at menu load');
  global.window.Net = { onOpen: null, onClose: null };
  hookNet();
  assert.equal(typeof global.window.Net.onOpen, 'function',
    'hookNet wires onOpen after Net arrives');
  assert.equal(typeof global.window.Net.onClose, 'function',
    'hookNet wires onClose after Net arrives');
});
