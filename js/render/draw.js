// Consumes: Config (sizes, GROUND), World (live state), document (canvas)
// Produces: renderAll() (draws one frame, called by render/loop.js)

import { W, H, GROUND } from '../config.js';
import { World } from '../world.js';

const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');

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
  for (const s of World.level.solid) {
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
  const gate = World.level.gate;
  const top = gate.y - gate.h * World.openAmt;      // rigid panel slides upward
  const panelTop = Math.max(top, 120);              // visible slice of the panel
  const panelBottom = Math.min(top + gate.h, GROUND);
  ctx.fillStyle = '#394a5c';                        // permanent door frame
  ctx.fillRect(gate.x - 4, 120, gate.w + 8, GROUND - 120);
  if (panelTop < panelBottom) {
    tile(gate.x, panelTop, gate.w, panelBottom - panelTop, '#7fa0bc', '#5a7693');
    ctx.fillStyle = '#d8e3ee';                      // handle
    ctx.fillRect(gate.x + gate.w / 2 - 3, panelBottom - 52, 6, 16);
  }
}

function drawSwitches() {
  for (const s of World.switches) {
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
  const block = World.block;
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
  const goal = World.level.goal;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
  ctx.fillStyle = 'rgba(38,208,124,0.14)';         // soft carpet on the floor
  ctx.fillRect(goal.x, GROUND - 14, goal.w, 14);
  ctx.strokeStyle = `rgba(38,208,124,${0.45 + pulse * 0.4})`;
  ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
  rr(goal.x, goal.y, goal.w, goal.h, 8); ctx.stroke();
  ctx.setLineDash([]);
  // shimmering goal gem
  const cx = goal.x + goal.w / 2, cy = GROUND - 46;
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
  const glow = World.won;
  if (glow) {                                      // victory halo
    ctx.shadowColor = 'rgba(140,255,190,0.9)'; ctx.shadowBlur = 22;
  }
  ctx.fillStyle = p === World.players[0] ? '#ff5b5b' : '#5b8dff';
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

function drawRope() {
  const rope = World.level.rope;
  if (!rope) return;
  const [a, b] = World.players;
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2, by = b.y + b.h / 2;
  const slack = Math.max(0, rope - Math.hypot(bx - ax, by - ay));
  ctx.strokeStyle = '#6d4519';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 8 + slack * 0.15,
    bx, by);
  ctx.stroke();
}

function drawParts() {  for (const p of World.parts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawWin() {
  if (World.won) {                                 // green screen flash, fading
    ctx.fillStyle = `rgba(90,255,150,${0.22 * Math.sin(World.winT * 3 + 1) + 0.18})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export function renderAll() {
  drawSky();
  drawPit();
  drawSolids();
  drawGate();
  drawSwitches();
  drawBlock();
  drawGoal();
  for (const p of World.players) drawPlayer(p);
  drawRope();
  drawParts();
  drawWin();
}
