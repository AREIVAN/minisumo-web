import type { RobotSpec } from '../domain/index';

export const FRONT_BLADE_ANGLE = -0.52;
export const FRONT_BLADE_CENTER_Z_RATIO = -0.35;

export function createRobotWedgeVertices(spec: RobotSpec): Float32Array {
  const width = spec.width * 0.94;
  const depth = spec.depth * 0.92;
  const bottom = -spec.height * 0.43;
  const frontTop = spec.height * 0.1;
  const rearTop = spec.height * 0.38;
  const frontZ = -depth / 2 + 0.018;
  const rearZ = depth / 2 - 0.004;
  const halfWidth = width / 2;

  return new Float32Array([
    -halfWidth,
    bottom,
    -depth / 2,
    halfWidth,
    bottom,
    -depth / 2,
    halfWidth,
    bottom,
    depth / 2,
    -halfWidth,
    bottom,
    depth / 2,
    -halfWidth,
    frontTop,
    frontZ,
    halfWidth,
    frontTop,
    frontZ,
    halfWidth,
    rearTop,
    rearZ,
    -halfWidth,
    rearTop,
    rearZ,
  ]);
}

/** Vertices for one convex collision hull matching the rendered wedge and blade. */
export function createRobotCollisionVertices(spec: RobotSpec): Float32Array {
  const wedge = createRobotWedgeVertices(spec);
  const bladeWidth = spec.width * 0.9;
  const bladeHeight = 0.004;
  const bladeDepth = spec.depth * 0.32;
  const halfWidth = bladeWidth / 2;
  const halfHeight = bladeHeight / 2;
  const halfDepth = bladeDepth / 2;
  const centerY = -spec.height * 0.27;
  // The angled blade's projected depth stays inside the robot's declared
  // envelope, including its 4 mm thickness.
  const centerZ = spec.depth * FRONT_BLADE_CENTER_Z_RATIO;
  const cosine = Math.cos(FRONT_BLADE_ANGLE);
  const sine = Math.sin(FRONT_BLADE_ANGLE);
  const blade = new Float32Array(8 * 3);

  let vertex = 0;
  for (const x of [-halfWidth, halfWidth]) {
    for (const y of [-halfHeight, halfHeight]) {
      for (const z of [-halfDepth, halfDepth]) {
        blade[vertex] = x;
        blade[vertex + 1] = centerY + y * cosine - z * sine;
        blade[vertex + 2] = centerZ + y * sine + z * cosine;
        vertex += 3;
      }
    }
  }

  const result = new Float32Array(wedge.length + blade.length);
  result.set(wedge);
  result.set(blade, wedge.length);
  return result;
}
