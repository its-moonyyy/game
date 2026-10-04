// Consumes: nothing (pure level data, no logic)
// Produces: Level2 (a wider pit and a higher wall, same rules)

export const Level2 = {
  name: 'level-2',
  title: 'The High Wall',
  solid: [
    { x: 0, y: 470, w: 200, h: 70 },    // start ledge
    { x: 390, y: 470, w: 570, h: 70 },  // main ground (pit 200..390)
    { x: 610, y: 300, w: 40, h: 170 },  // rock wall (needs the crate)
    { x: 660, y: 360, w: 80, h: 16 },   // lookout ledge (optional)
  ],
  gate: { x: 770, y: 120, w: 30, h: 350 },
  switches: [
    { x: 717, y: 458, w: 32, h: 12 },   // outer (S1)
    { x: 825, y: 458, w: 32, h: 12 },   // inner (S2)
  ],
  goal: { x: 845, y: 428, w: 110, h: 45 },
  spawn: [{ x: 60, y: 430 }, { x: 140, y: 430 }],
  blockStart: { x: 470, y: 430 },
};
