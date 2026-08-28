import { describe, expect, it } from 'vitest';
import { BASE_DOHYO_SPEC } from '../../src/domain/arena/dohyo-spec';
import {
  BOUNDARY_STATUS,
  BoundaryDetector,
  detectBoundary,
} from '../../src/domain/arena/boundary-detector';
import { createRobotSpec } from '../../src/domain/robot/robot-spec';

const robot = createRobotSpec({ width: 0.1, depth: 0.06 });

describe('BoundaryDetector', () => {
  it('keeps a centered footprint valid', () => {
    const result = detectBoundary(BASE_DOHYO_SPEC, robot, { x: 0, y: 0, yaw: 0 });

    expect(result.status).toBe(BOUNDARY_STATUS.VALID);
    expect(result.isOut).toBe(false);
    expect(result.outsidePoints).toHaveLength(0);
  });

  it('keeps a footprint whose corner is exactly on the outer edge valid', () => {
    const halfDepth = robot.depth / 2;
    const halfWidth = robot.width / 2;
    const centerX = Math.sqrt(BASE_DOHYO_SPEC.outerRadius ** 2 - halfDepth ** 2) - halfWidth;
    const result = detectBoundary(BASE_DOHYO_SPEC, robot, { x: centerX, y: 0, yaw: 0 });

    expect(result.status).toBe(BOUNDARY_STATUS.VALID);
    expect(result.outsidePoints).toHaveLength(0);
  });

  it('detects a rotated corner outside even while the center remains inside', () => {
    const result = detectBoundary(BASE_DOHYO_SPEC, robot, {
      x: 0.331,
      y: 0,
      yaw: Math.PI / 4,
    });

    expect(result.status).toBe(BOUNDARY_STATUS.OUT);
    expect(result.isOut).toBe(true);
    expect(result.outsidePoints.length).toBeGreaterThan(0);
  });

  it('can be used as a reusable detector for the same dohyo and robot', () => {
    const detector = new BoundaryDetector(BASE_DOHYO_SPEC, robot);

    expect(detector.isOut({ x: 0, y: 0, yaw: 0 })).toBe(false);
    expect(detector.isOut({ x: 0.4, y: 0, yaw: 0 })).toBe(true);
  });
});
