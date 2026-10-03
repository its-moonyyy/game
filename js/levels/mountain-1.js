// Consumes: nothing (pure level data, no logic)
// Produces: LevelMountain1 (960x5000 vertical climb, same rules)

// Vertical gaps are all <= 130 px (jump reaches 146), except one
// 180 px gap that needs a head-boost jump (boost reaches 267).
// Horizontal gaps between consecutive ledges are all <= 220 px.
const LEDGES = [
  [300, 4940, 360],
  [80, 4820, 240],
  [420, 4700, 240],
  [680, 4580, 220],
  [380, 4460, 260],
  [100, 4340, 240],
  [560, 4220, 240],
  [300, 4100, 220],
  [650, 3980, 250],
  [350, 3860, 240],
  [60, 3740, 220],
  [420, 3620, 260],
  [700, 3500, 200],
  [380, 3380, 240],
  [140, 3260, 260],
  [480, 3140, 220],
  [700, 3020, 200],
  [420, 2900, 240],
  [120, 2780, 240],
  [500, 2660, 260],
  [200, 2540, 220],
  [560, 2420, 240],
  [300, 2300, 200],
  [640, 2180, 220],
  [360, 2060, 240],
  [80, 1940, 220],
  [420, 1820, 260],
  [660, 1700, 180],
  [400, 1580, 240],
  [120, 1460, 260],
  [480, 1340, 220],
  [700, 1220, 200],
  [380, 1100, 240],
  [100, 1040, 220],
  [460, 860, 240],
  [700, 740, 180],
  [420, 620, 220],
  [150, 500, 240],
  [500, 380, 220],
  [250, 260, 240],
  [0, 200, 960],
];

export const LevelMountain1 = {
  name: 'mountain-1',
  title: 'Montagne',
  h: 5000,
  rope: 140,
  solid: [
    ...LEDGES.map(([x, y, w]) => ({ x, y, w, h: 24 })),
    { x: 60, y: 2900, w: 60, h: 600 },    // west wall (detour right)
    { x: 840, y: 1500, w: 60, h: 500 },   // east wall (detour left)
  ],
  gate: null,
  switches: [],
  checkpoints: [
    { x: 760, y: 3940 },
    { x: 620, y: 2620 },
    { x: 240, y: 1420 },
  ],
  goal: { x: 0, y: 0, w: 960, h: 200 },
  spawn: [{ x: 440, y: 4900 }, { x: 520, y: 4900 }],
  blockStart: null,
};
