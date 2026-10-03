// Consumes: Config (sizes, speeds), World (live state), keys (keyboard)
// Produces: updatePlayers(dt), updateBlock(dt) (called by render/loop.js)

import { W, H, GROUND, GRAV, MOVE, JUMP, BOOST } from '../config.js';
import { World } from '../world.js';
import { keys } from '../input/keyboard.js';

/* =========================================================
   Physics & collision helpers (simple AABB)
   ========================================================= */
function collide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
function gateIsSolid() { return World.openAmt < 0.5; }

// Solids a player/block must consider right now.
function solidList() {
  return [...World.level.solid, gateIsSolid() ? World.level.gate : null,
    World.block].filter(Boolean);
}
function rectClear(r) {               // true if r overlaps nothing solid
  for (const s of solidList()) {
    if (s !== World.block && collide(r, s)) return false;
  }
  return true;
}

// Try to shove the crate by dx; it slides in fine steps and stops at the
// first wall/edge it meets. Returns how far it actually moved.
function tryPushBlock(dx) {
  const block = World.block;
  const dir = dx > 0 ? 1 : -1;
  const want = Math.abs(dx);
  let moved = 0;
  while (moved < want - 1e-6) {
    const step = Math.min(0.5, want - moved);
    block.x += dir * step;
    if (block.x < 0 || block.x + block.w > W ||
        World.level.solid.some(s => collide(block, s)) ||
        (gateIsSolid() && collide(block, World.level.gate))) {
      block.x -= dir * step;
      break;
    }
    moved += step;
  }
  return moved;
}

export function updatePlayers(dt) {
  for (const p of World.players) {
    // ---- horizontal movement + X collision ----
    let dir = 0;
    if (keys[p.cfg.left])  dir -= 1;
    if (keys[p.cfg.right]) dir += 1;
    p.dir = dir !== 0 ? dir : p.dir;
    p.vx = dir * MOVE;

    p.x += p.vx * dt;
    for (const s of solidList()) {
      if (!collide(p, s)) continue;
      if (s === World.block && p.vx !== 0) {          // pushing the crate
        const o = p.vx > 0 ? (p.x + p.w - s.x) : (s.x + s.w - p.x);
        tryPushBlock(p.vx > 0 ? o : -o);
        // hug the crate's face so no half-pixel crack remains
        p.x = p.vx > 0 ? Math.min(p.x, World.block.x - p.w)
                       : Math.max(p.x, World.block.x + World.block.w);
      } else {
        p.x = p.vx > 0 ? s.x - p.w : p.vx < 0 ? s.x + s.w : p.x;
        p.vx = 0;
      }
    }
    p.x = Math.max(0, Math.min(W - p.w, p.x));

    // ---- gravity + vertical movement + Y collision ----
    p.vy = Math.min(p.vy + GRAV * dt, 1200);
    p.gnd = false;
    p.y += p.vy * dt;
    for (const s of solidList()) {
      if (!collide(p, s)) continue;
      if (p.vy > 0) { p.y = s.y - p.h; p.gnd = true; }
      else if (p.vy < 0) { p.y = s.y + s.h; }
      p.vy = 0;
    }
  }

  // ---- player vs player: separate overlap, allow head-standing ----
  separatePlayers(World.players[0], World.players[1]);

  // ---- safety net: nobody may end a frame embedded inside a solid ----
  for (const p of World.players) {
    for (const s of solidList()) {
      if (!collide(p, s)) continue;
      const outL = p.x + p.w - s.x, outR = s.x + s.w - p.x;
      const outT = p.y + p.h - s.y, outB = s.y + s.h - p.y;
      const m = Math.min(outL, outR, outT, outB);
      if (m === outL) p.x = s.x - p.w; else if (m === outR) p.x = s.x + s.w;
      else if (m === outT) p.y = s.y - p.h; else p.y = s.y + s.h;
    }
  }

  // shove any player half-in a crate out the nearest side
  for (const p of World.players) {
    if (!collide(p, World.block)) continue;
    const block = World.block;
    const dx = Math.min(p.x + p.w, block.x + block.w) - Math.max(p.x, block.x);
    const dy = Math.min(p.y + p.h, block.y + block.h) - Math.max(p.y, block.y);
    if (dy <= dx || p.y + p.h <= block.y + 6) p.y = block.y - p.h;   // up top
    else p.x += p.x + p.w <= block.x + block.w ? -dx : dx;           // side
    p.x = Math.max(0, Math.min(W - p.w, p.x));
  }

  // ---- jumping (edge-triggered with a tiny buffer) ----
  for (const p of World.players) {
    if (p.jumpBuf > 0 && (p.gnd || p.onHead)) {
      p.vy = p.onHead ? -BOOST : -JUMP;
      p.jumpBuf = 0;
      p.gnd = false; p.onHead = false;
    }
  }
}

// Push overlapping players apart; the one on top lands on the other's head.
function separatePlayers(a, b) {
  if (!collide(a, b)) return;
  const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const centerA = a.x + a.w / 2, centerB = b.x + b.w / 2;

  if (dy < dx * 0.8) {                              // vertical split: on-head stand
    const top = a.y < b.y ? a : b;
    const newY = top.y - dy;
    if (newY >= 0 && rectClear({ x: top.x, y: newY, w: top.w, h: top.h })) {
      top.y = newY; top.vy = 0; top.onHead = true; // standing on a friend's head
      return;
    }
  }
  // horizontal shove
  const dir = centerA >= centerB ? 1 : -1;
  const half = dx / 2;
  a.x += dir * half; b.x -= dir * half;
  for (const p of [a, b]) p.x = Math.max(0, Math.min(W - p.w, p.x));
}

export function updateBlock(dt) {
  const block = World.block;
  // gravity + vertical resolution (weighs it down into pits too)
  block.vy = Math.min(block.vy + GRAV * dt, 1200);
  block.y += block.vy * dt;
  for (const s of solidList()) {
    if (s === block || !collide(block, s)) continue;
    if (block.vy > 0) { block.y = s.y - block.h; block.vy = 0; }
    else if (block.vy < 0) { block.y = s.y + s.h; block.vy = 0; }
  }
  // crate lost down the pit -> recycle it back to its starting spot
  if (block.y > H + 60) {
    block.x = World.level.blockStart.x;
    block.y = World.level.blockStart.y;
    block.vy = 0;
  }
}
