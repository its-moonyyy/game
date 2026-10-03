// Consumes: Level1
// Produces: Levels registry (adding a level = one entry here)

import { Level1 } from './level-1.js';

export const Levels = {
  current() { return Level1; },
  get(name) { return name === 'level-1' ? Level1 : Level1; },
};
