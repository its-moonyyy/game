// Consumes: document (menu DOM), window.Game/Net/TouchPad (facades),
//   Clipboard (copy/paste)
// Produces: window.Menu (show/setStatus/onSelect), mode flows

import { Clipboard } from './clipboard.js';
import { Levels } from '../levels/index.js';

const P1_MAP = { left: 'a', right: 'd', jump: 'w' };
const P2_MAP = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' };
const NO_INPUT = { left: false, right: false, jump: false };
const GUEST_KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump' };
let role = null;
let guestPlay = false;
const guestInput = { ...NO_INPUT };
let selectedLevel = 'level-1';

function el(id) {
  return document.getElementById(id);
}

const VIEWPORT_FULL = 'width=device-width, initial-scale=1';
const VIEWPORT_LOCKED = 'width=device-width, initial-scale=1,' +
  ' maximum-scale=1, user-scalable=no';

function show(view) {
  el('menu-view').hidden = view !== 'menu';
  el('game-view').hidden = view !== 'game';
  el('viewport').content = view === 'game' ? VIEWPORT_LOCKED : VIEWPORT_FULL;
}

function setStatus(text) {
  el('menu-status').textContent = text;
}

function fail(err) {
  setStatus('error: ' + err.message);
}

function mountPad(id, mapping, onChange) {
  const container = el(id);
  container.innerHTML = '';
  if (typeof window !== 'undefined' && window.TouchPad) {
    window.TouchPad.mount(container, mapping, onChange);
  }
}

function selectedLevelFromUrl() {
  if (typeof window === 'undefined' || !window.location) return 'level-1';
  const name = new URLSearchParams(window.location.search).get('level');
  return Levels.get(name).name;
}

function renderLevels() {
  const row = el('level-row');
  row.innerHTML = '';
  for (const { name, title } of Levels.list()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = title;
    btn.disabled = name === selectedLevel;
    btn.addEventListener('click', () => {
      selectedLevel = name;
      if (window.Game) window.Game.resetWorld(name);
      setStatus(title + ' selected');
      renderLevels();
    });
    row.appendChild(btn);
  }
}

function startLocal() {
  role = 'local';
  guestPlay = false;
  if (window.Game) {
    window.Game.resetWorld(selectedLevel);
    window.Game.setLocalPlayer(null);
  }
  show('game');
  mountPad('pad-p1', P1_MAP);
  mountPad('pad-p2', P2_MAP);
}

function startHost() {
  role = 'host';
  guestPlay = false;
  if (window.Game) {
    window.Game.resetWorld(selectedLevel);
    window.Game.setLocalPlayer(0);
  }
  if (!window.Net) return;
  setStatus('creating invite code');
  window.Net.host(selectedLevel).then((h) => {
    el('invite-out').value = h.code;
    setStatus('waiting for guest');
    h.connected.catch(fail);
  }).catch(fail);
}

function connectPressed() {
  const code = el('invite-in').value.trim();
  if (!code) {
    setStatus('paste a friend invite code first');
    return;
  }
  if (role === 'host') {
    if (!window.Net) return;
    window.Net.confirm(code).catch(fail);
    return;
  }
  role = 'join';
  if (!window.Net) return;
  window.Net.join(code).then((j) => {
    el('invite-out').value = j.code;
    if (j.level && window.Game) {
      selectedLevel = j.level;
      window.Game.resetWorld(j.level);
    }
    setStatus('connecting, share your code back');
  }).catch(fail);
}

function copyInvite() {
  Clipboard.copy(el('invite-out'), setStatus);
}

function pasteInvite() {
  Clipboard.paste(el('invite-in'), setStatus);
}

function sendGuestInput() {
  if (window.Net) window.Net.sendInput({ ...guestInput });
}

function guestKey(e, down) {
  if (!guestPlay) return;
  const action = GUEST_KEYS[e.key];
  if (!action) return;
  if (typeof e.preventDefault === 'function') e.preventDefault();
  guestInput[action] = down;
  sendGuestInput();
}

function onOpen(openedRole) {
  el('net-overlay').hidden = true;
  show('game');
  if (openedRole === 'guest') {
    guestPlay = true;
    guestInput.left = guestInput.right = guestInput.jump = false;
    if (window.Game) {
      window.Game.setSimEnabled(true);
      window.Game.setLocalPlayer(-1);
    }
    if (window.Net) {
      window.Net.ready(true);
    }
    mountPad('pad-p1', P2_MAP, (input) => window.Net.sendInput(input));
  } else {
    mountPad('pad-p1', P1_MAP);
  }
}

function onClose(closedRole) {
  if (closedRole === 'guest') {
    guestPlay = false;
    guestInput.left = guestInput.right = guestInput.jump = false;
    if (window.Game) {
      window.Game.setSimEnabled(true);
      window.Game.setLocalPlayer(null);
    }
    show('menu');
    setStatus('host left');
  } else {
    if (window.Game) window.Game.setRemoteInput(1, NO_INPUT);
    el('net-overlay-text').textContent = 'guest disconnected, waiting';
    el('net-overlay').hidden = false;
  }
}

function select(mode) {
  if (typeof api.onSelect === 'function') {
    api.onSelect(mode);
    return;
  }
  if (mode === 'local') startLocal();
  else if (mode === 'host' || mode === 'join') {
    role = mode;
    if (mode === 'host') startHost();
    else setStatus('paste the host invite code');
  }
}

function bind() {
  selectedLevel = selectedLevelFromUrl();
  if (window.Game) window.Game.resetWorld(selectedLevel);
  renderLevels();
  el('btn-local').addEventListener('click', () => select('local'));
  el('btn-host').addEventListener('click', () => select('host'));
  el('btn-join').addEventListener('click', () => select('join'));
  el('btn-connect').addEventListener('click', connectPressed);
  el('btn-copy').addEventListener('click', copyInvite);
  el('btn-paste').addEventListener('click', pasteInvite);
  el('btn-exit').addEventListener('click', () => {
    el('net-overlay').hidden = true;
    guestPlay = false;
    if (window.Game) window.Game.setLocalPlayer(null);
    show('menu');
  });
  if (typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', (e) => guestKey(e, true));
    window.addEventListener('keyup', (e) => guestKey(e, false));
  }
  hookNet();
}

export function hookNet() {
  if (typeof window !== 'undefined' && window.Net) {
    window.Net.onOpen = onOpen;
    window.Net.onClose = onClose;
  }
}

const api = { show, setStatus, onSelect: null };

if (typeof window !== 'undefined') window.Menu = api;
if (typeof document !== 'undefined' && document.addEventListener) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
}

export const MenuApi = api;
