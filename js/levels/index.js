// Consumes: Level1, Level2, Level3, Level4, LevelMountain1
// Produces: Levels registry (adding a level = one entry here)

import { Level1 } from './level-1.js';
import { Level2 } from './level-2.js';
import { Level3 } from './level-3.js';
import { Level4 } from './level-4.js';
import { LevelMountain1 } from './mountain-1.js';

const ALL = { 'level-1': Level1, 'level-2': Level2, 'level-3': Level3,
  'level-4': Level4, 'mountain-1': LevelMountain1 };

export const Levels = {
  current() { return Level1; },
  get(name) { return ALL[name] || Level1; },
  list() { return Object.values(ALL).map((l) => ({ name: l.name, title: l.title })); },
};
