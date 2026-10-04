// Consumes: nothing (pure level data, no logic)
// Produces: Level1 (static geometry + spawn points + crate start)

// Level flow: cross the pit, push the crate against the rock wall to
// climb it, then hold switches so both friends get past the sliding
// gate and into the goal.
export const Level1 = {
  name: 'level-1',
  title: 'First Steps',
  // Static solid rectangles. The pit (x 250..390) has no solid.
  solid: [
    { x: 0, y: 470, w: 250, h: 70 },    // start ledge
    { x: 390, y: 470, w: 570, h: 70 },  // main ground
    { x: 552, y: 310, w: 40, h: 160 },  // rock wall (needs the crate)
  ],
  // Gate that slides up while a switch is held.
  gate: { x: 690, y: 120, w: 30, h: 350 },
  // Pressure pads (flush with the floor).
  switches: [
    { x: 637, y: 458, w: 32, h: 12 },   // outer (S1)
    { x: 745, y: 458, w: 32, h: 12 },   // inner (S2)
  ],
  // Goal zone behind the gate, both players must stand in it.
  goal: { x: 815, y: 428, w: 110, h: 45 },
  spawn: [{ x: 80, y: 430 }, { x: 160, y: 430 }],
  // Pushable crate start, in front of the rock wall.
  blockStart: { x: 430, y: 430 },
};
