// Consumes: Config (sizes, keyCfgs), Levels (static geometry)
// Produces: buildWorld(level), World (live singleton), resetWorld,
//   getSnapshot, applySnapshot (snapshot protocol v2, see CONTRACTS.md)

import { PW, PH, BW } from './config.js';
import { keyCfgs } from './config.js';
import { Levels } from './levels/index.js';
import { cam } from './render/view.js';

export function buildWorld(level) {
  return {
    level,
    players: keyCfgs().map((cfg, i) => ({
      cfg, x: level.spawn[i].x, y: level.spawn[i].y, w: PW, h: PH,
      vx: 0, vy: 0, gnd: false, onHead: false,
      dir: 1, jumpBuf: 0, ropeHold: 0, grab: false, stamina: 0,
    })),
    block: level.blockStart
      ? { x: level.blockStart.x, y: level.blockStart.y, w: BW, h: BW, vy: 0 }
      : null,
    switches: level.switches.map((s) => ({ ...s, pressed: false })),
    checkpoints: (level.checkpoints || []).map((c) => ({ ...c, hit: false })),
    openAmt: 0,
    grace: 0,
    won: false,
    winT: 0,
    timeMs: 0,
    started: false,
    parts: [],
  };
}

let World = buildWorld(Levels.current());
cam.y = World.level.h ? World.level.h - 540 : 0;

export { World };

export function resetWorld(name) {
  World = buildWorld(Levels.get(name));
  cam.y = World.level.h ? World.level.h - 540 : 0;
}

export function getSnapshot() {
  return {
    v: 2,
    level: World.level.name,
    players: World.players.map((p) => ({ x: p.x, y: p.y, vx: p.vx,
      vy: p.vy, dir: p.dir, grab: p.grab, stamina: p.stamina })),
    block: World.block
      ? { x: World.block.x, y: World.block.y, vy: World.block.vy }
      : null,
    openAmt: World.openAmt,
    switches: World.switches.map((s) => s.pressed),
    checkpoints: World.checkpoints.map((c) => ({ ...c })),
    timeMs: World.timeMs,
    started: World.started,
    won: World.won,
  };
}

export function applySnapshot(s) {  s.players.forEach((sp, i) => {
    World.players[i].x = sp.x; World.players[i].y = sp.y;
    World.players[i].vx = sp.vx; World.players[i].vy = sp.vy;
    if (typeof sp.dir === 'number') World.players[i].dir = sp.dir;
    if (typeof sp.grab === 'boolean') World.players[i].grab = sp.grab;
    if (typeof sp.stamina === 'number') World.players[i].stamina = sp.stamina;
  });
  if (s.block && World.block) {
    World.block.x = s.block.x;
    World.block.y = s.block.y;
    World.block.vy = s.block.vy;
  }
  World.openAmt = s.openAmt;
  s.switches.forEach((pressed, i) => {
    World.switches[i].pressed = pressed;
  });
  if (Array.isArray(s.checkpoints)) {
    s.checkpoints.forEach((sc, i) => {
      if (World.checkpoints[i]) World.checkpoints[i].hit = !!sc.hit;
    });
  }
  if (typeof s.timeMs === 'number') World.timeMs = s.timeMs;
  if (typeof s.started === 'boolean') World.started = s.started;
  World.won = s.won;
}
