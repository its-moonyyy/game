import { test } from 'node:test';
import assert from 'node:assert';
import { Levels } from '../js/levels/index.js';
import { buildWorld } from '../js/world.js';

test('level registry and world factory', () => {
  const names = Levels.list().map((l) => l.name);
  assert.deepEqual(names, ['level-1', 'level-2', 'level-3', 'level-4']);
  for (const { name, title } of Levels.list()) {
    assert.ok(title.length > 0, name + ' has a title');
  }
  const level = Levels.get('level-1');
  assert.equal(level.name, 'level-1');
  assert.ok(level.solid.length > 0, 'has solids');
  assert.ok(level.spawn.length === 2, 'spawns two players');
  assert.deepEqual(Levels.get('nope'), level, 'unknown level falls back');

  for (const { name } of Levels.list()) {
    const world = buildWorld(Levels.get(name));
    assert.equal(world.players[0].x, world.level.spawn[0].x,
      name + ' players spawn placed');
    assert.deepEqual(world.switches.map((s) => s.pressed),
      world.switches.map(() => false), name + ' switches start open');
    const goal = world.level.goal;
    assert.ok(goal.x + goal.w <= 960, name + ' goal fits the world');
  }

  const a = buildWorld(level);
  const b = buildWorld(level);
  assert.notEqual(a.players, b.players, 'factory returns fresh state');
});
