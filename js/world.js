// Consumes: Config (sizes, CFG), Levels (static geometry)
// Produces: buildWorld(level), World (live singleton), resetWorld,
//   getSnapshot, applySnapshot (snapshot protocol v1, see CONTRACTS.md)

import { PW, PH, BW } from './config.js';
import { CFG } from './config.js';
import { Levels } from './levels/index.js';

export function buildWorld(level) {
  return {
    level,
    players: CFG.map((cfg, i) => ({
      cfg, x: level.spawn[i].x, y: level.spawn[i].y, w: PW, h: PH,
      vx: 0, vy: 0, gnd: false, onHead: false,
      dir: 1, jumpBuf: 0,
    })),
    block: { x: level.blockStart.x, y: level.blockStart.y,
      w: BW, h: BW, vy: 0 },
    switches: level.switches.map((s) => ({ ...s, pressed: false })),
    openAmt: 0,
    grace: 0,
    won: false,
    winT: 0,
    parts: [],
  };
}

let World = buildWorld(Levels.current());

export { World };

export function resetWorld(name) {
  World = buildWorld(Levels.get(name));
}

export function getSnapshot() {
  return {
    v: 1,
    level: World.level.name,
    players: World.players.map((p) => ({ x: p.x, y: p.y, vx: p.vx,
      vy: p.vy, dir: p.dir })),
    block: { x: World.block.x, y: World.block.y, vy: World.block.vy },
    openAmt: World.openAmt,
    switches: World.switches.map((s) => s.pressed),
    won: World.won,
  };
}

export function applySnapshot(s) {  s.players.forEach((sp, i) => {
    World.players[i].x = sp.x; World.players[i].y = sp.y;
    World.players[i].vx = sp.vx; World.players[i].vy = sp.vy;
    if (typeof sp.dir === 'number') World.players[i].dir = sp.dir;
  });
  World.block.x = s.block.x;
  World.block.y = s.block.y;
  World.block.vy = s.block.vy;
  World.openAmt = s.openAmt;
  s.switches.forEach((pressed, i) => {
    World.switches[i].pressed = pressed;
  });
  World.won = s.won;
}
