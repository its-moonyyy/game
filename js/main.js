// Consumes: every js/ module (import order = boot order)
// Produces: window.Game facade (the only public seam, see CONTRACTS.md)

import './ui/menu.js';
import './input/touch.js';
import './net/peer.js';
import './render/loop.js';
import { resetWorld, getSnapshot, applySnapshot } from './world.js';
import { Levels } from './levels/index.js';
import { setRemoteInput, setLocalPlayer } from './input/keyboard.js';
import { setSimEnabled } from './render/loop.js';

// Debug affordance for vibe iteration: ?level=name jumps to content.
if (typeof window !== 'undefined' && window.location) {
  const level = new URLSearchParams(window.location.search).get('level');
  if (level && Levels.get(level).name === level) resetWorld(level);
}

if (typeof window !== 'undefined') {
  window.Game = {
    getSnapshot, applySnapshot, setRemoteInput, setSimEnabled,
    setLocalPlayer,
  };
}
