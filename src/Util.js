export function distance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function angleFromKeys(keys) {
  let angle = null;

  if (keys.up && keys.left) {
    angle = 135;
  } else if (keys.up && keys.right) {
    angle = 45;
  } else if (keys.down && keys.left) {
    angle = 225;
  } else if (keys.down && keys.right) {
    angle = 315;
  } else if (keys.up) {
    angle = 90;
  } else if (keys.down) {
    angle = 270;
  } else if (keys.left) {
    angle = 180;
  } else if (keys.right) {
    angle = 0;
  }

  // For isometric maps, subtract 45 degrees
  if (angle !== null) angle += 45;

  return angle;
}
