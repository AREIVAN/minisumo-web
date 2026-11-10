import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PRACTICE_ROBOT_SPEC } from '../../src/domain/index';
import { createRobotCollisionVertices } from '../../src/simulation/robot-geometry';
import { createRobotMesh } from '../../src/simulation/render/robot-mesh';

function getAxisBounds(vertices: Float32Array, axis: 0 | 2): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let index = axis; index < vertices.length; index += 3) {
    min = Math.min(min, vertices[index]);
    max = Math.max(max, vertices[index]);
  }

  return { min, max };
}

describe('Mini Sumo robot envelope', () => {
  it('keeps the collision hull inside the declared 10 x 10 cm footprint', () => {
    const vertices = createRobotCollisionVertices(PRACTICE_ROBOT_SPEC);
    const xBounds = getAxisBounds(vertices, 0);
    const zBounds = getAxisBounds(vertices, 2);

    expect(xBounds.min).toBeGreaterThanOrEqual(-PRACTICE_ROBOT_SPEC.width / 2);
    expect(xBounds.max).toBeLessThanOrEqual(PRACTICE_ROBOT_SPEC.width / 2);
    expect(zBounds.min).toBeGreaterThanOrEqual(-PRACTICE_ROBOT_SPEC.depth / 2);
    expect(zBounds.max).toBeLessThanOrEqual(PRACTICE_ROBOT_SPEC.depth / 2);
  });

  it('keeps every rendered part, including wheels and hubs, inside the declared footprint', () => {
    const robot = createRobotMesh(PRACTICE_ROBOT_SPEC);
    robot.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(robot);

    expect(bounds.min.x).toBeGreaterThanOrEqual(-PRACTICE_ROBOT_SPEC.width / 2);
    expect(bounds.max.x).toBeLessThanOrEqual(PRACTICE_ROBOT_SPEC.width / 2);
    expect(bounds.min.z).toBeGreaterThanOrEqual(-PRACTICE_ROBOT_SPEC.depth / 2);
    expect(bounds.max.z).toBeLessThanOrEqual(PRACTICE_ROBOT_SPEC.depth / 2);
  });
});
