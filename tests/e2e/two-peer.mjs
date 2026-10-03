// Consumes: a local Chromium with --remote-debugging-port=9223 (or CDP_HOST)
// Produces: nothing (verification only). Skips cleanly without CDP.
//
// Run: CDP_HOST=127.0.0.1:9223 node tests/e2e/two-peer.mjs
// Serve the repo first: npm run serve (expects http://localhost:8903/).

import { test } from 'node:test';
import assert from 'node:assert';

const CDP = `http://${process.env.CDP_HOST || '127.0.0.1:9223'}`;
const GAME = process.env.GAME_URL || 'http://localhost:8903/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function reachable() {
  try {
    const r = await fetch(CDP + '/json/version');
    return r.ok;
  } catch (e) {
    return false;
  }
}

test('two-peer host/join flow', async (t) => {
  if (!await reachable()) {
    t.skip('no CDP browser (set CDP_HOST), skipping browser E2E');
    return;
  }
  let msgId = 0;
  const pending = new Map();
  const sockets = [];
  function connect(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      sockets.push(ws);
      ws.onopen = () => resolve(ws);
      ws.onerror = reject;
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pending.has(m.id)) {
          const p = pending.get(m.id);
          pending.delete(m.id);
          if (m.error) p.reject(new Error(JSON.stringify(m.error)));
          else p.resolve(m.result);
        }
      };
    });
  }
  function send(ws, method, params = {}) {
    const id = ++msgId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function newPage() {
    const r = await fetch(CDP + '/json/new?about:blank', { method: 'PUT' });
    const target = await r.json();
    const ws = await connect(target.webSocketDebuggerUrl);
    ws._url = target.webSocketDebuggerUrl;
    await send(ws, 'Page.enable');
    await send(ws, 'Runtime.enable');
    await send(ws, 'Network.enable');
    await send(ws, 'Network.setCacheDisabled', { cacheDisabled: true });
    return ws;
  }
  async function ev(ws, expr) {
    const res = await send(ws, 'Runtime.evaluate',
      { expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) {
      throw new Error('page error: ' +
        JSON.stringify(res.exceptionDetails).slice(0, 300));
    }
    return res.result.value;
  }
  async function activate(ws) {
    const list = await (await fetch(CDP + '/json/list')).json();
    const mine = list.find((x) => x.webSocketDebuggerUrl === ws._url);
    if (mine) await fetch(CDP + '/json/activate/' + mine.id, { method: 'PUT' });
  }

  const a = await newPage();
  const b = await newPage();
  try {
  await send(a, 'Page.navigate', { url: GAME });
  await send(b, 'Page.navigate', { url: GAME });
  await sleep(1500);
  assert.equal(await ev(a, `!document.getElementById('menu-view').hidden`),
    true, 'menu is first view');

  await ev(a, `document.getElementById('btn-host').click()`);
  await sleep(2500);
  const codeA = await ev(a, `document.getElementById('invite-out').value`);
  await ev(b, `document.getElementById('btn-join').click()`);
  await ev(b,
    `document.getElementById('invite-in').value = ${JSON.stringify(codeA)}`);
  await ev(b, `document.getElementById('btn-connect').click()`);
  await sleep(2500);
  const codeB = await ev(b, `document.getElementById('invite-out').value`);
  await ev(a,
    `document.getElementById('invite-in').value = ${JSON.stringify(codeB)}`);
  await ev(a, `document.getElementById('btn-connect').click()`);
  await sleep(1500);
  assert.equal(await ev(a, `!document.getElementById('game-view').hidden`),
    true, 'host enters game');
  assert.equal(await ev(b, `!document.getElementById('game-view').hidden`),
    true, 'guest enters game');

  await activate(a);
  const before = (await ev(a, `Game.getSnapshot()`)).players[1].x;
  await ev(b, `Net.sendInput({left:true,right:false,jump:false})`);
  await sleep(700);
  const after = (await ev(a, `Game.getSnapshot()`)).players[1].x;
  assert.ok(after < before, 'guest input moves host P2');

  assert.equal((await ev(a, `Game.getSnapshot()`)).level, 'mountain-1',
    'mountain boots by default');
  await ev(b, `Net.sendInput({left:false,right:false,jump:false})`);
  await sleep(300);
  const p1start = (await ev(a, `Game.getSnapshot()`)).players[0].x;
  await ev(a, `window.dispatchEvent(new KeyboardEvent('keydown', {key:'d'}))`);
  await sleep(500);
  await ev(a, `window.dispatchEvent(new KeyboardEvent('keyup', {key:'d'}))`);
  const moved = (await ev(a, `Game.getSnapshot()`)).players[0].x;
  assert.ok(moved > p1start, 'Bread moves right on the mountain');
  await ev(a, `(() => { const s = Game.getSnapshot();
    s.players[0].x = 480; s.players[0].y = 100;
    s.players[1].x = 500; s.players[1].y = 100;
    Game.applySnapshot(s); })()`);
  await sleep(800);
  assert.equal((await ev(a, `Game.getSnapshot()`)).won, true,
    'summit wins on mountain');
  } finally {
    for (const ws of sockets) ws.close();
  }
});
