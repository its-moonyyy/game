import { test } from 'node:test';
import assert from 'node:assert';
import { createCamera, updateCamera } from '../js/render/camera.js';
import { cam } from '../js/render/view.js';
import { resetWorld } from '../js/world.js';

test('camera follows midpoint with lookahead and clamps', () => {
  const cam = createCamera();
  assert.equal(cam.y, 0, 'starts at top');
  updateCamera(cam, { x: 0, y: 4800 }, { x: 0, y: 4700 }, 1, 5000);
  assert.ok(Math.abs(cam.y - 4210) < 400, 'near midpoint minus lookahead');
  updateCamera(cam, { x: 0, y: 100 }, { x: 0, y: 100 }, 10, 5000);
  assert.equal(cam.y, 0, 'clamped at top');
  updateCamera(cam, { x: 0, y: 4950 }, { x: 0, y: 4950 }, 10, 5000);
  assert.equal(cam.y, 4460, 'clamped at bottom');
});

test('resetWorld reframes the camera on spawn', () => {
  resetWorld('mountain-1');
  assert.equal(cam.y, 4460, 'camera starts at base view');
});
