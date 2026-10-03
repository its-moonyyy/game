// Consumes: every js/ module (import order = boot order)
// Produces: window.Game facade (the only public seam, see CONTRACTS.md)

import './ui/menu.js';
import './input/touch.js';
import './net/peer.js';
import './render/loop.js';
import { getSnapshot, applySnapshot } from './world.js';
import { setRemoteInput, setLocalPlayer } from './input/keyboard.js';
import { setSimEnabled } from './render/loop.js';

if (typeof window !== 'undefined') {
  window.Game = {
    getSnapshot, applySnapshot, setRemoteInput, setSimEnabled,
    setLocalPlayer,
  };
}
