import { test } from 'node:test';
import assert from 'node:assert';
import { Levels } from '../js/levels/index.js';
import { buildWorld } from '../js/world.js';

test('level registry and world factory', () => {
  const names = Levels.list().map((l) => l.name);
  assert.deepEqual(names, ['level-1', 'level-2', 'level-3', 'level-4',
    'mountain-1']);
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

test('mountain-1 vertical data', () => {
  const mountain = Levels.get('mountain-1');
  assert.equal(mountain.h, 5000, 'world is 5000 px tall');
  assert.equal(mountain.checkpoints.length, 3, 'three checkpoints');
  for (const c of mountain.checkpoints) {
    assert.ok(c.x >= 0 && c.x <= 960, 'checkpoint in bounds');
  }
  assert.ok(mountain.goal.y + mountain.goal.h <= 200,
    'summit zone in top 200 px');
  for (const s of mountain.solid) {
    assert.ok(s.x >= 0 && s.x + s.w <= 960, 'solid inside width');
  }
  for (const sp of mountain.spawn) {
    assert.ok(sp.y > 4800, 'spawn near the base');
  }
  const tops = mountain.solid.map((s) => s.y).sort((x, y) => y - x);
  const big = tops.filter((t, i) => i > 0 && tops[i - 1] - t > 130);
  assert.equal(big.length, 1, 'one head-boost gap');
  assert.ok(big[0] === 860, 'boost gap lands at 860');
  for (let i = 1; i < tops.length; i++) {
    const gap = tops[i - 1] - tops[i];
    assert.ok(gap <= 130 || gap === 180, 'climbable gaps');
  }
  const world = buildWorld(mountain);
  assert.equal(world.players[0].x, mountain.spawn[0].x, 'spawns placed');
});
