// Consumes: nothing (pure follow math)
// Produces: createCamera(), updateCamera(cam, p1, p2, dt, worldH),
//   CAM_SMOOTH, CAM_LOOKAHEAD

export const CAM_SMOOTH = 5;
export const CAM_LOOKAHEAD = 120;
const VIEW_H = 540;
const VIEW_MID = 270;

export function createCamera() {
  return { y: 0 };
}

export function updateCamera(cam, p1, p2, dt, worldH) {
  const mid = (p1.y + p2.y) / 2;
  let target = mid - VIEW_MID;
  if (target < cam.y) target -= CAM_LOOKAHEAD;   // look ahead when climbing
  cam.y += (target - cam.y) * Math.min(1, CAM_SMOOTH * dt);
  cam.y = Math.max(0, Math.min(worldH - VIEW_H, cam.y));
}
