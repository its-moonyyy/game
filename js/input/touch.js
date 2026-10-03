// Consumes: keys (keyboard), World (players for jump parity)
// Produces: TouchPad.mount(container, mapping, onChange)

import { keys } from './keyboard.js';
import { World } from '../world.js';

function isTouchDevice() {
  return (typeof window !== 'undefined' && 'ontouchstart' in window) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
}

function currentInput(state) {
  return { left: state.left, right: state.right, jump: state.jump };
}

function mount(container, mapping, onChange) {
  if (!isTouchDevice()) return false;
  const state = { left: false, right: false, jump: false };
  const held = { left: null, right: null, jump: null };

  function emit() {
    if (typeof onChange === 'function') onChange(currentInput(state));
  }

  function press(action) {
    state[action] = true;
    World.started = true;
    keys[mapping[action]] = true;
    if (action === 'jump') {
      for (const p of World.players) {
        if (p.cfg.jump === mapping.jump) p.jumpBuf = 0.15;
      }
    }
    emit();
  }

  function release(action) {
    state[action] = false;
    keys[mapping[action]] = false;
    emit();
  }

  const labels = { left: '\u25C0', right: '\u25B6', jump: '\u25B2' };
  for (const action of ['left', 'right', 'jump']) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = labels[action];
    btn.className = 'pad-' + action;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (held[action] === null) {
          held[action] = t.identifier;
          press(action);
        }
      }
    }, { passive: false });
    const end = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (held[action] === t.identifier) {
          held[action] = null;
          release(action);
        }
      }
    };
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('touchcancel', end, { passive: false });
    container.appendChild(btn);
  }
  return true;
}

export const TouchPad = { mount };

if (typeof window !== 'undefined') {
  window.TouchPad = TouchPad;
}
