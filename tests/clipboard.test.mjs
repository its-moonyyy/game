import { test } from 'node:test';
import assert from 'node:assert';
import { Clipboard } from '../js/ui/clipboard.js';

test('clipboard copy/paste with manual fallbacks', async () => {
  let status = '';
  const setStatus = (t) => { status = t; };
  const written = [];
  Object.defineProperty(global, 'navigator', { value: { clipboard: {
    async writeText(t) { written.push(t); },
    async readText() { return 'PASTED'; },
  } }, configurable: true });

  await Clipboard.copy({ value: 'CODE' }, setStatus);
  assert.deepEqual(written, ['CODE'], 'copy writes the code');
  assert.equal(status, 'code copied');

  const box = {};
  await Clipboard.paste(box, setStatus);
  assert.equal(box.value, 'PASTED', 'paste fills the box');
  assert.equal(status, 'code pasted');

  Object.defineProperty(global, 'navigator',
    { value: {}, configurable: true });
  let selected = false;
  await Clipboard.copy({ value: 'C', select() { selected = true; } },
    setStatus);
  assert.ok(selected, 'denied copy selects the text');
  assert.match(status, /manually/);
  await Clipboard.paste({}, setStatus);
  assert.match(status, /manually/, 'denied paste explains manual fallback');

  delete global.navigator;
});
