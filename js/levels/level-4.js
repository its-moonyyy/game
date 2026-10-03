// Consumes: nothing (pure level data, no logic)
// Produces: Level4 (les deux joueurs liés par une corde incassable)

export const Level4 = {
  name: 'level-4',
  title: 'La Corde',
  // La corde (voir `rope`) interdit tout éloignement : les puits se
  // traversent ensemble, la caisse se pousse à deux.
  rope: 220,                // distance max entre les centres, en px
  solid: [
    { x: 0, y: 470, w: 160, h: 70 },    // start ledge
    { x: 340, y: 470, w: 180, h: 70 },  // middle ground (pit 160..340)
    { x: 660, y: 470, w: 300, h: 70 },  // main ground (pit 520..660)
    { x: 760, y: 310, w: 40, h: 160 },  // rock wall (needs the crate)
  ],
  gate: { x: 860, y: 120, w: 30, h: 350 },
  switches: [
    { x: 810, y: 458, w: 32, h: 12 },   // outer (S1)
    { x: 905, y: 458, w: 32, h: 12 },   // inner (S2)
  ],
  goal: { x: 880, y: 428, w: 80, h: 45 },
  spawn: [{ x: 50, y: 430 }, { x: 110, y: 430 }],
  blockStart: { x: 700, y: 430 },
};
