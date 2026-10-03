// Consumes: camera + rope creators
// Produces: cam, rope (the single live view state; loop steps it,
//   draw reads it)

import { createCamera } from './camera.js';
import { createRope, ROPE_SEGMENTS } from '../sim/rope.js';

export const cam = createCamera();
export const rope = createRope(ROPE_SEGMENTS);
