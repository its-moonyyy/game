import { test } from 'node:test';
import assert from 'node:assert';
import { Levels } from '../js/levels/index.js';
import { buildWorld } from '../js/world.js';

test('level registry and world factory', () => {
  const level = Levels.get('level-1');
  assert.equal(level.name, 'level-1');
  assert.ok(level.solid.length > 0, 'has solids');
  assert.ok(level.spawn.length === 2, 'spawns two players');
  assert.deepEqual(Levels.get('nope'), level, 'unknown level falls back');

  const a = buildWorld(level);
  const b = buildWorld(level);
  assert.notEqual(a.players, b.players, 'factory returns fresh state');
  assert.equal(a.players[0].x, level.spawn[0].x, 'players spawn placed');
  assert.deepEqual(a.switches.map((s) => s.pressed), [false, false]);
});
