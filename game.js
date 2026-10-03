'use strict';

/* =========================================================
   Level data & constants
   ========================================================= */
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
const W = 960, H = 540;

const GROUND = 470;          // top surface of the main floor
const GRAV   = 1400;         // gravity px/s^2
const MOVE   = 270;          // horizontal run speed px/s
const JUMP   = 640;          // normal jump velocity px/s
const BOOST  = 864;          // boosted jump velocity px/s (off a friend's head)
const PW = 36, PH = 40;      // player size
const BW = 40;               // pushable block size (square)

// Static solid rectangles. The pit (x 250..390) has no solid -> deadly gap.
const SOLID = [
  { x: 0,   y: GROUND, w: 250, h: H - GROUND },   // start ledge
  { x: 390, y: GROUND, w: W - 390, h: H - GROUND },// main ground
  { x: 552, y: 310,    w: 40,  h: GROUND - 310 },  // rock wall (needs the crate)
];
// Level flow: cross the pit, push the crate against the rock wall to climb it,
// then hold switches so both friends get past the sliding gate and into the goal.

// Gate that slides up while a switch is held.
const GATE = { x: 690, y: 120, w: 30, h: GROUND - 120 };

// Pressure pads (flush with the floor).
const SWITCHES = [
  { x: 637, y: GROUND - 12, w: 32, h: 12, pressed: false }, // outer (S1)
  { x: 745, y: GROUND - 12, w: 32, h: 12, pressed: false }, // inner (S2)
];

// Pushable crate. Starts on the main ground in front of the rock wall.
const block = { x: 430, y: GROUND - BW, w: BW, h: BW, vy: 0 };

// Goal zone on the flat ground behind the gate - both players must stand in it.
const GOAL = { x: 815, y: GROUND - PH - 2, w: 110, h: 45 };

const SPAWN = [ { x: 80, y: GROUND - PH }, { x: 160, y: GROUND - PH } ];

/* =========================================================
   Input handling (P1: WASD, P2: arrows)
   ========================================================= */
const CFG = [
  { left: 'a', right: 'd', jump: 'w' },
  { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' },
];
const keys = {};
let localPlayer = null;   // null = every player reads the keyboard (same screen)
function keyOwner(key) {
  for (let i = 0; i < players.length; i++) {
    const c = players[i].cfg;
    if (c.left === key || c.right === key || c.jump === key) return i;
  }
  return -1;
}
window.addEventListener('keydown', (e) => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if (!e.repeat) {
    const i = keyOwner(e.key);
    if (localPlayer !== null && i !== localPlayer) return;   // owned by the remote side
    keys[e.key] = true;
    for (const p of players) if (p.cfg.jump === e.key) p.jumpBuf = 0.15;   // queue a jump
  }
});
window.addEventListener('keyup', (e) => {
  if (localPlayer === null || keyOwner(e.key) === localPlayer) {
    keys[e.key] = false;
  }
});
window.addEventListener('blur', () => {
  for (const k in keys) {
    if (localPlayer === null || keyOwner(k) === localPlayer) keys[k] = false;
  }
});

/* =========================================================
   Players
   ========================================================= */
const players = CFG.map((cfg, i) => ({
  cfg, x: SPAWN[i].x, y: SPAWN[i].y, w: PW, h: PH,
  vx: 0, vy: 0, gnd: false, onHead: false,
  dir: 1, jumpBuf: 0,
}));
const P1 = players[0], P2 = players[1];

/* =========================================================
   Physics & collision helpers (simple AABB)
   ========================================================= */
function collide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
function gateIsSolid() { return openAmt < 0.5; }

// Solids a player/block must consider right now.
function solidList() {
  return [...SOLID, gateIsSolid() ? GATE : null, block].filter(Boolean);
}
function rectClear(r) {               // true if r overlaps nothing solid
  for (const s of solidList()) if (s !== block && collide(r, s)) return false;
  return true;
}

// Try to shove the crate by dx; it slides in fine steps and stops at the
// first wall/edge it meets. Returns how far it actually moved.
function tryPushBlock(dx) {
  const dir = dx > 0 ? 1 : -1;
  const want = Math.abs(dx);
  let moved = 0;
  while (moved < want - 1e-6) {
    const step = Math.min(0.5, want - moved);
    block.x += dir * step;
    if (block.x < 0 || block.x + block.w > W ||
        SOLID.some(s => collide(block, s)) ||
        (gateIsSolid() && collide(block, GATE))) {
      block.x -= dir * step;
      break;
    }
    moved += step;
  }
  return moved;
}

function updatePlayers(dt) {
  for (const p of players) {
    // ---- horizontal movement + X collision ----
    let dir = 0;
    if (keys[p.cfg.left])  dir -= 1;
    if (keys[p.cfg.right]) dir += 1;
    p.dir = dir !== 0 ? dir : p.dir;
    p.vx = dir * MOVE;

    p.x += p.vx * dt;
    for (const s of solidList()) {
      if (!collide(p, s)) continue;
      if (s === block && p.vx !== 0) {          // pushing the crate
        const o = p.vx > 0 ? (p.x + p.w - s.x) : (s.x + s.w - p.x);
        tryPushBlock(p.vx > 0 ? o : -o);
        // hug the crate's face so no half-pixel crack remains
        p.x = p.vx > 0 ? Math.min(p.x, block.x - p.w)
                       : Math.max(p.x, block.x + block.w);
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
  separatePlayers(P1, P2);

  // ---- safety net: nobody may end a frame embedded inside a solid ----
  for (const p of players) {
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
  for (const p of players) {
    if (!collide(p, block)) continue;
    const dx = Math.min(p.x + p.w, block.x + block.w) - Math.max(p.x, block.x);
    const dy = Math.min(p.y + p.h, block.y + block.h) - Math.max(p.y, block.y);
    if (dy <= dx || p.y + p.h <= block.y + 6) p.y = block.y - p.h;   // up top
    else p.x += p.x + p.w <= block.x + block.w ? -dx : dx;           // side
    p.x = Math.max(0, Math.min(W - p.w, p.x));
  }

  // ---- jumping (edge-triggered with a tiny buffer) ----
  for (const p of players) {
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

function updateBlock(dt) {
  // gravity + vertical resolution (weighs it down into pits too)
  block.vy = Math.min(block.vy + GRAV * dt, 1200);
  block.y += block.vy * dt;
  for (const s of solidList()) {
    if (s === block || !collide(block, s)) continue;
    if (block.vy > 0) { block.y = s.y - block.h; block.vy = 0; }
    else if (block.vy < 0) { block.y = s.y + s.h; block.vy = 0; }
  }
  // crate lost down the pit -> recycle it back to its starting spot
  if (block.y > H + 60) { block.x = 430; block.y = GROUND - BW; block.vy = 0; }
}

/* =========================================================
   Switches -> gate
   ========================================================= */
let openAmt = 0, grace = 0, won = false, winT = 0;

function updateSwitches(dt) {
  for (const s of SWITCHES)
    s.pressed = players.some(p =>
      p.gnd && p.y + p.h >= GROUND - 10 &&
      p.x < s.x + s.w && p.x + p.w > s.x);

  const held = SWITCHES.some(s => s.pressed);
  if (held) { grace = 0.45; openAmt = Math.min(1, openAmt + dt * 2.2); }
  else if (grace > 0) grace -= dt;
  else openAmt = Math.max(0, openAmt - dt * 2.2);   // close after the grace window
}

/* =========================================================
   Win / respawn
   ========================================================= */
function updateWin(dt) {
  if (!won && players.every(p => collide(p, GOAL))) { won = true; winT = 0; }
  if (won) {
    winT += dt;
    if (winT < 3.2 && parts.length < 420) burst(GOAL.x + GOAL.w / 2, GOAL.y + GOAL.h / 2, 8);
  }
  for (const p of players) if (p.y > H + 80) {     // fell into the depths -> respawn
    p.x = SPAWN[players.indexOf(p)].x; p.y = SPAWN[players.indexOf(p)].y;
    p.vx = 0; p.vy = 0;
  }
}

/* =========================================================
   Particles
   ========================================================= */
let parts = [];
function burst(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 160;
    parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      life: 0.7 + Math.random() * 0.8,
      col: ['#ffe066', '#8ff0a4', '#ff6b6b', '#66d9ff', '#ffffff'][i % 5],
      size: 3 + Math.random() * 5,
    });
  }
}
function updateParts(dt) {
  for (const p of parts) {
    p.vy += GRAV * 0.7 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.y > GROUND) { p.y = GROUND; p.vy *= -0.4; p.vx *= 0.7; }
  }
  parts = parts.filter(p => p.life > 0);
}

/* =========================================================
   Main update
   ========================================================= */
function update(dt) {
  for (const p of players) p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  updatePlayers(dt);
  updateBlock(dt);
  updateSwitches(dt);
  updateWin(dt);
  updateParts(dt);
}

/* =========================================================
   Rendering helpers (all shapes, no text/DOM UI)
   ========================================================= */
function rr(x, y, w, h, r) {                      // rounded rect path
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, '#9fd8ff'); g.addColorStop(1, '#eaf7ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff8d8';                       // sun
  ctx.beginPath(); ctx.arc(880, 60, 30, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,250,220,0.35)';
  ctx.beginPath(); ctx.arc(880, 60, 54, 0, 7); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';         // clouds
  for (const [cx, cy, s] of [[140, 70, 1], [420, 46, 0.7], [640, 96, 1.3]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 22 * s, 0, 7);
    ctx.arc(cx + 24 * s, cy - 10 * s, 18 * s, 0, 7);
    ctx.arc(cx + 48 * s, cy, 20 * s, 0, 7);
    ctx.fill();
  }
}

function drawPit() {
  const g = ctx.createLinearGradient(0, GROUND, 0, H);
  g.addColorStop(0, '#1d2431'); g.addColorStop(1, '#090c12');
  ctx.fillStyle = g; ctx.fillRect(250, GROUND, 140, H - GROUND);
  ctx.strokeStyle = '#0a0d14'; ctx.lineWidth = 4;
  ctx.strokeRect(250, GROUND, 140, H - GROUND);
}

function tile(x, y, w, h, top, face) {             // stone slab tile
  ctx.fillStyle = face; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = top; ctx.fillRect(x, y, w, 5);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  for (let i = 10; i < w; i += 22)                 // subtle cut lines
    ctx.fillRect(x + i, y + 9, 6, 3);
}

function drawSolids() {
  for (const s of SOLID) {
    if (s.y === GROUND) {                          // the dirt floor + grass
      ctx.fillStyle = '#b07a4f'; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#7ccc4f'; ctx.fillRect(s.x, s.y, s.w, 7);
      ctx.fillStyle = '#5fae39';
      for (let i = 0; i < s.w; i += 26) {          // grass blades
        ctx.beginPath(); ctx.moveTo(s.x + i, s.y);
        ctx.lineTo(s.x + i + 5, s.y - 9); ctx.lineTo(s.x + i + 10, s.y);
        ctx.closePath(); ctx.fill();
      }
    } else {                                       // raised walls/rocks
      tile(s.x, s.y, s.w, s.h, '#d7e3ee', '#9fb0c0');
    }
  }
}

function drawGate() {
  const top = GATE.y - GATE.h * openAmt;            // rigid panel slides upward
  const panelTop = Math.max(top, 120);              // visible slice of the panel
  const panelBottom = Math.min(top + GATE.h, GROUND);
  ctx.fillStyle = '#394a5c';                        // permanent door frame
  ctx.fillRect(GATE.x - 4, 120, GATE.w + 8, GROUND - 120);
  if (panelTop < panelBottom) {
    tile(GATE.x, panelTop, GATE.w, panelBottom - panelTop, '#7fa0bc', '#5a7693');
    ctx.fillStyle = '#d8e3ee';                      // handle
    ctx.fillRect(GATE.x + GATE.w / 2 - 3, panelBottom - 52, 6, 16);
  }
}

function drawSwitches() {
  for (const s of SWITCHES) {
    ctx.fillStyle = '#7d848d';                     // pad base
    rr(s.x - 4, s.y + 4, s.w + 8, s.h, 4); ctx.fill();
    const down = s.pressed ? 4 : 0;                // button sinks when held
    ctx.fillStyle = s.pressed ? '#ffe066' : '#a8a8a8';
    rr(s.x + 2, s.y - 4 + down, s.w - 4, 12, 6); ctx.fill();
    ctx.fillStyle = s.pressed ? '#fffbe6' : '#d9d9d9';
    ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y - 2 + down, 5, 0, 7); ctx.fill();
    if (s.pressed) {                               // soft glow while held
      ctx.strokeStyle = 'rgba(255,224,102,0.55)'; ctx.lineWidth = 3;
      rr(s.x - 6, s.y - 8, s.w + 12, 18, 8); ctx.stroke();
    }
  }
}

function drawBlock() {                             // wooden crate
  ctx.fillStyle = '#c98f4b'; ctx.fillRect(block.x, block.y, block.w, block.h);
  ctx.fillStyle = '#8a5a28';
  ctx.fillRect(block.x, block.y, block.w, 5);      // rim shading
  ctx.strokeStyle = '#6d4519'; ctx.lineWidth = 3;
  ctx.strokeRect(block.x + 1.5, block.y + 1.5, block.w - 3, block.h - 3);
  ctx.beginPath();                                  // X braces
  ctx.moveTo(block.x + 5, block.y + 5); ctx.lineTo(block.x + block.w - 5, block.y + block.h - 5);
  ctx.moveTo(block.x + block.w - 5, block.y + 5); ctx.lineTo(block.x + 5, block.y + block.h - 5);
  ctx.stroke();
}

function drawGoal() {
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
  ctx.fillStyle = 'rgba(38,208,124,0.14)';         // soft carpet on the floor
  ctx.fillRect(GOAL.x, GROUND - 14, GOAL.w, 14);
  ctx.strokeStyle = `rgba(38,208,124,${0.45 + pulse * 0.4})`;
  ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
  rr(GOAL.x, GOAL.y, GOAL.w, GOAL.h, 8); ctx.stroke();
  ctx.setLineDash([]);
  // shimmering goal gem
  const cx = GOAL.x + GOAL.w / 2, cy = GROUND - 46;
  ctx.fillStyle = `rgba(126,255,180,${0.5 + pulse * 0.5})`;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 9, cy); ctx.lineTo(cx, cy + 12);
  ctx.lineTo(cx - 9, cy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1f9e63'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(38,208,124,0.5)';          // little flag
  ctx.fillRect(cx + 12, cy - 11, 3, 14);
  ctx.fillRect(cx + 12, cy - 11, 14, 6);
}

function drawPlayer(p) {
  const glow = won;
  if (glow) {                                      // victory halo
    ctx.shadowColor = 'rgba(140,255,190,0.9)'; ctx.shadowBlur = 22;
  }
  ctx.fillStyle = p === P1 ? '#ff5b5b' : '#5b8dff';
  rr(p.x, p.y, p.w, p.h, 7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  rr(p.x, p.y, p.w, p.h, 7); ctx.stroke();

  const ex = p.dir > 0 ? p.x + 19 : p.x + 11;      // eyes (face the run dir)
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ex, p.y + 16, 5.5, 0, 7); ctx.arc(ex + 10, p.y + 16, 5.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#203040';
  ctx.beginPath(); ctx.arc(ex + p.dir * 1.5, p.y + 17, 2.6, 0, 7);
  ctx.arc(ex + 10 + p.dir * 1.5, p.y + 17, 2.6, 0, 7); ctx.fill();
}

function drawParts() {
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawWin() {
  if (won) {                                       // green screen flash, fading
    ctx.fillStyle = `rgba(90,255,150,${0.22 * Math.sin(winT * 3 + 1) + 0.18})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* =========================================================
   Game loop (requestAnimationFrame)
   ========================================================= */
let last = performance.now();
let simEnabled = true;   // guest mode disables simulation but keeps drawing
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);  // clamp long frames
  last = now;
  if (simEnabled) update(dt);
  drawSky();
  drawPit();
  drawSolids();
  drawGate();
  drawSwitches();
  drawBlock();
  drawGoal();
  for (const p of players) drawPlayer(p);
  drawParts();
  drawWin();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* =========================================================
   Multiplayer hooks (snapshots + remote input, no physics here)
   ========================================================= */
function getSnapshot() {
  return {
    players: players.map((p) => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy })),
    block: { x: block.x, y: block.y, vy: block.vy },
    openAmt,
    switches: SWITCHES.map((s) => s.pressed),
    won,
  };
}

function applySnapshot(s) {
  s.players.forEach((sp, i) => {
    players[i].x = sp.x; players[i].y = sp.y;
    players[i].vx = sp.vx; players[i].vy = sp.vy;
  });
  block.x = s.block.x; block.y = s.block.y; block.vy = s.block.vy;
  openAmt = s.openAmt;
  s.switches.forEach((pressed, i) => { SWITCHES[i].pressed = pressed; });
  won = s.won;
}

function setRemoteInput(i, input) {
  const p = players[i];
  keys[p.cfg.left] = !!input.left;
  keys[p.cfg.right] = !!input.right;
  if (input.jump && !p.remoteJumpHeld) p.jumpBuf = 0.15;  // rising edge only
  p.remoteJumpHeld = !!input.jump;
}

function setSimEnabled(on) {
  simEnabled = !!on;
}

function setLocalPlayer(i) {
  localPlayer = (i === null || i === undefined) ? null : i;
}

if (typeof window !== 'undefined') {
  window.Game = { getSnapshot, applySnapshot, setRemoteInput, setSimEnabled,
    setLocalPlayer };
}
