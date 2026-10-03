// Consumes: nothing
// Produces: canvas/world/physics constants, player input maps (CFG)

export const W = 960, H = 540;

export const GROUND = 470;          // top surface of the main floor
export const GRAV = 1400;           // gravity px/s^2
export const MOVE = 270;            // horizontal run speed px/s
export const JUMP = 640;            // normal jump velocity px/s
export const BOOST = 864;           // boosted jump velocity px/s (off a friend's head)
export const PW = 36, PH = 40;      // player size
export const BW = 40;               // pushable block size (square)

export const CFG = [
  { left: 'a', right: 'd', jump: 'w' },
  { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' },
];
