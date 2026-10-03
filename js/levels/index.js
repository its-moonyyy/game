// Consumes: LevelMountain1
// Produces: Levels registry (adding a level = one entry here)

import { LevelMountain1 } from './mountain-1.js';

const ALL = { 'mountain-1': LevelMountain1 };

export const Levels = {
  current() { return LevelMountain1; },
  get(name) { return ALL[name] || LevelMountain1; },
  list() { return Object.values(ALL).map((l) => ({ name: l.name, title: l.title })); },
};
