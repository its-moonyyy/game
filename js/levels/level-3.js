// Consumes: nothing (pure level data, no logic)
// Produces: Level3 (twin pits with a rest island, same rules)

export const Level3 = {
  name: 'level-3',
  title: 'Twin Pits',
  solid: [
    { x: 0, y: 470, w: 150, h: 70 },    // start ledge
    { x: 290, y: 470, w: 210, h: 70 },  // rest island (pit 150..290)
    { x: 640, y: 470, w: 320, h: 70 },  // main ground (pit 500..640)
    { x: 700, y: 310, w: 40, h: 160 },  // rock wall (needs the crate)
  ],
  gate: { x: 800, y: 120, w: 30, h: 350 },
  switches: [
    { x: 747, y: 458, w: 32, h: 12 },   // outer (S1)
    { x: 855, y: 458, w: 32, h: 12 },   // inner (S2)
  ],
  goal: { x: 860, y: 428, w: 100, h: 45 },
  spawn: [{ x: 50, y: 430 }, { x: 110, y: 430 }],
  blockStart: { x: 648, y: 430 },
};
