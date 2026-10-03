// Consumes: Level1, Level2, Level3
// Produces: Levels registry (adding a level = one entry here)

import { Level1 } from './level-1.js';
import { Level2 } from './level-2.js';
import { Level3 } from './level-3.js';

const ALL = { 'level-1': Level1, 'level-2': Level2, 'level-3': Level3 };

export const Levels = {
  current() { return Level1; },
  get(name) { return ALL[name] || Level1; },
  list() { return Object.values(ALL).map((l) => ({ name: l.name, title: l.title })); },
};
