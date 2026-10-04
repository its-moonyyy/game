// Consumes: nothing
// Produces: canvas/world/physics constants, player input maps (keyCfgs)

export const W = 960, H = 540;

export const GROUND = 470;          // top surface of the main floor
export const GRAV = 1400;           // gravity px/s^2
export const MOVE = 270;            // horizontal run speed px/s
export const JUMP = 640;            // normal jump velocity px/s
export const BOOST = 864;           // boosted jump velocity px/s (off a friend's head)
export const PW = 36, PH = 40;      // player size
export const BW = 40;               // pushable block size (square)

const KEYMAPS = {
  azerty: [
    { left: 'q', right: 'd', jump: 'z' },
    { left: 'arrowleft', right: 'arrowright', jump: 'arrowup' },
  ],
  qwerty: [
    { left: 'a', right: 'd', jump: 'w' },
    { left: 'arrowleft', right: 'arrowright', jump: 'arrowup' },
  ],
};

let currentLayout = 'azerty';

export function setKeyLayout(name) {
  if (KEYMAPS[name]) currentLayout = name;
}

export function keyLayout() {
  return currentLayout;
}

export function keyCfgs() {
  return KEYMAPS[currentLayout];
}

// Legacy alias (azerty); prefer keyCfgs().
export const CFG = KEYMAPS.azerty;
