import { test } from 'node:test';
import assert from 'node:assert';
import { b64url } from './helpers.mjs';

test('invite codes and snapshot queue validation', async () => {
  global.window = {};
  global.window.Game = { applied: null,
    applySnapshot(s) { this.applied = JSON.parse(JSON.stringify(s)); } };

  await import('../js/net/peer.js');
  const Net = global.window.Net;
  assert.ok(Net, 'window.Net exists');
  const T = Net._test;

  const code = T.encodeInvite({ type: 'offer', sdp: 'x', id: 'abc' });
  assert.ok(code.startsWith('eyJ'), 'invite code starts with eyJ marker');
  assert.throws(() => T.decodeInvite(code), /own/,
    'own code paste-back rejected');

  const foreign = b64url({ type: 'offer', sdp: 'y', id: 'zzz' });
  assert.equal(T.decodeInvite(foreign).sdp, 'y', 'foreign code decodes');
  assert.throws(() => T.decodeInvite('!!!'), /invalid/,
    'garbage code rejected');
  assert.throws(
    () => T.decodeInvite(b64url({ type: 'answer', sdp: 'y', id: 'q' }), 'offer'),
    /type/, 'wrong-type code rejected');

  const fixture = { v: 1, players: [{ x: 1, y: 2, vx: 3, vy: 4 },
    { x: 5, y: 6, vx: 7, vy: 8 }],
    block: { x: 9, y: 10, vy: 11 }, openAmt: 0.5,
    switches: [true, false], won: false };

  const seen = [];
  Net.onState = (s) => { seen.push(s); };
  T.injectState({ ...fixture, players: [{ ...fixture.players[0], x: 50 },
    fixture.players[1]] });
  T.injectState(fixture);
  assert.equal(seen.length, 0, 'nothing delivered while not ready');
  T.setReady(true);
  assert.equal(seen.length, 1, 'one delivery on ready');
  assert.deepEqual(seen[0], fixture, 'latest queued snapshot delivered');
  assert.deepEqual(global.window.Game.applied, null,
    'queue path does not touch Game directly');

  T.injectState({ nope: true });
  assert.equal(seen.length, 1, 'malformed snapshot ignored');

  T.setReady(false);
  const missingSwitches = { ...fixture };
  delete missingSwitches.switches;
  T.injectState(missingSwitches);
  T.setReady(true);
  assert.equal(seen.length, 1, 'snapshot without switches never delivered');
  T.setReady(false);
  T.injectState({ ...fixture, won: 'yes' });
  T.setReady(true);
  assert.equal(seen.length, 1, 'snapshot with bad won flag never delivered');
  T.setReady(false);
  const { v, ...unversioned } = fixture;
  T.injectState(unversioned);
  T.setReady(true);
  assert.equal(seen.length, 1, 'unversioned snapshot never delivered');
});
