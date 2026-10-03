// Consumes: window.Game (snapshots/inputs, looked up at call time)
// Produces: Sync (validation, queue, prediction, cadence)

let clock = () => Date.now();

const SNAP_MS = 33;
const guest = { ready: false, queued: null, latest: null, active: false };
let lastLocal = { left: false, right: false, jump: false };

function validSnapshot(s) {
  if (!s || s.v !== 2) return false;
  if (!Array.isArray(s.players) || s.players.length !== 2) {
    return false;
  }
  for (const p of s.players) {
    if (!['x', 'y', 'vx', 'vy'].every((k) => typeof p[k] === 'number')) {
      return false;
    }
    if (typeof p.grab !== 'boolean' || typeof p.stamina !== 'number') {
      return false;
    }
  }
  if (s.block !== null && (!s.block || !['x', 'y', 'vy']
    .every((k) => typeof s.block[k] === 'number'))) {
    return false;
  }
  if (typeof s.openAmt !== 'number') return false;
  if (!Array.isArray(s.switches) ||
    !s.switches.every((v) => typeof v === 'boolean')) {
    return false;
  }
  return typeof s.won === 'boolean';
}

function deliver(snap, onState) {
  if (typeof onState === 'function') onState(snap);
}

function pushSnapshot(snap) {
  if (!validSnapshot(snap)) return false;
  if (!guest.ready) {
    guest.queued = snap;
    return true;
  }
  guest.latest = { snap, at: clock() };
  return true;
}

function extrapolate(snap, ageMs) {
  const t = Math.min(Math.max(ageMs, 0), 150) / 1000;
  const out = JSON.parse(JSON.stringify(snap));
  for (const p of out.players) {
    p.x += p.vx * t;
    p.y += p.vy * t;
  }
  if (out.block) out.block.y += out.block.vy * t;
  return out;
}

function reconcile(local, host) {
  const dx = host.x - local.x;
  const dy = host.y - local.y;
  if (dx * dx + dy * dy > 36 * 36) return { x: host.x, y: host.y };
  return { x: local.x + dx * 0.35, y: local.y + dy * 0.35 };
}

function mergePrediction(localSnap, serverSnap, ageMs) {
  const fresh = extrapolate(serverSnap, ageMs);
  const out = JSON.parse(JSON.stringify(fresh));
  out.players[1] = { ...fresh.players[1],
    ...reconcile(localSnap.players[1], fresh.players[1]) };
  return out;
}

function guestFrame() {
  if (!guest.active) return;
  if (guest.latest && typeof window !== 'undefined' && window.Game) {
    const merged = mergePrediction(window.Game.getSnapshot(),
      guest.latest.snap, clock() - guest.latest.at);
    window.Game.applySnapshot(merged);
    window.Game.setRemoteInput(1, lastLocal);
  }
  requestAnimationFrame(guestFrame);
}

function setReady(on, onState) {
  guest.ready = !!on;
  if (guest.ready && guest.queued) {
    const snap = guest.queued;
    guest.queued = null;
    guest.latest = null;
    pushSnapshot(snap);
    if (guest.latest) deliver(guest.latest.snap, onState);
  }
}

function resetGuest() {
  guest.active = false;
  guest.ready = false;
  guest.queued = null;
  guest.latest = null;
}

function recordLocal(input) {
  lastLocal = { ...input };
}

export const Sync = {
  SNAP_MS, validSnapshot, pushSnapshot, extrapolate, reconcile,
  mergePrediction, guestFrame, setReady, resetGuest, recordLocal,
  latest: () => guest.latest && guest.latest.snap,
  setClock: (fn) => { clock = fn; },
  setActive: (on) => { guest.active = !!on; },
};
