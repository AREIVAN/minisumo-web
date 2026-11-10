import { describe, expect, it } from 'vitest';
import { BASE_DOHYO_SPEC } from '../../src/domain/arena/dohyo-spec';
import {
  BOUNDARY_STATUS,
  BoundaryDetector,
  detectBoundary,
  transformRobotFootprint,
} from '../../src/domain/arena/boundary-detector';
import { createRobotSpec } from '../../src/domain/robot/robot-spec';

const robot = createRobotSpec({ width: 0.1, depth: 0.06 });

function minimumDistanceToFootprintEdges(
  points: readonly { x: number; y: number }[],
): number {
  return Math.min(
    ...points.map((point, index) => {
      const next = points[(index + 1) % points.length];
      const edgeX = next.x - point.x;
      const edgeY = next.y - point.y;
      const edgeLengthSquared = edgeX * edgeX + edgeY * edgeY;
      const projection = Math.max(
        0,
        Math.min(-(point.x * edgeX + point.y * edgeY) / edgeLengthSquared, 1),
      );
      return Math.hypot(point.x + projection * edgeX, point.y + projection * edgeY);
    }),
  );
}

describe('BoundaryDetector', () => {
  it('keeps a centered footprint valid', () => {
    const result = detectBoundary(BASE_DOHYO_SPEC, robot, { x: 0, y: 0, yaw: 0 });

    expect(result.status).toBe(BOUNDARY_STATUS.VALID);
    expect(result.isOut).toBe(false);
    expect(result.outsidePoints).toHaveLength(0);
  });

  it('keeps a whole footprint tangent to the outer edge valid', () => {
    const centerX = BASE_DOHYO_SPEC.outerRadius + robot.width / 2;
    const result = detectBoundary(BASE_DOHYO_SPEC, robot, { x: centerX, y: 0, yaw: 0 });

    expect(result.status).toBe(BOUNDARY_STATUS.VALID);
    expect(result.outsidePoints.length).toBeGreaterThan(0);
    expect(result.minimumDistanceToCenter).toBeCloseTo(BASE_DOHYO_SPEC.outerRadius);
  });

  it('keeps a partially crossed footprint in until the whole robot clears the dohyo', () => {
    const result = detectBoundary(BASE_DOHYO_SPEC, robot, {
      x: 0.38,
      y: 0,
      yaw: Math.PI / 4,
    });

    expect(result.status).toBe(BOUNDARY_STATUS.VALID);
    expect(result.isOut).toBe(false);
    expect(result.outsidePoints.length).toBeGreaterThan(0);
  });

  it('detects a rotated robot only after its full footprint clears the edge', () => {
    const result = detectBoundary(BASE_DOHYO_SPEC, robot, {
      x: 0.46,
      y: 0,
      yaw: Math.PI / 4,
    });

    expect(result.status).toBe(BOUNDARY_STATUS.OUT);
    expect(result.isOut).toBe(true);
    expect(result.minimumDistanceToCenter).toBeGreaterThan(BASE_DOHYO_SPEC.outerRadius);
  });

  it('keeps the diagonal 10 cm footprint in while it still overlaps the dohyo', () => {
    const squareRobot = createRobotSpec({ width: 0.1, depth: 0.1 });
    const pose = { x: 0.22, y: 0.381, yaw: -Math.PI / 6 };
    const footprint = transformRobotFootprint(squareRobot, pose);
    const result = detectBoundary(BASE_DOHYO_SPEC, squareRobot, pose);

    expect(result.status).toBe(BOUNDARY_STATUS.VALID);
    expect(result.outsidePoints.length).toBeGreaterThan(0);
    expect(result.minimumDistanceToCenter).toBeCloseTo(0.372, 2);
    expect(result.minimumDistanceToCenter).toBeCloseTo(
      minimumDistanceToFootprintEdges(footprint),
      10,
    );
  });

  it('can be used as a reusable detector for the same dohyo and robot', () => {
    const detector = new BoundaryDetector(BASE_DOHYO_SPEC, robot);

    expect(detector.isOut({ x: 0, y: 0, yaw: 0 })).toBe(false);
    expect(detector.isOut({ x: 0.45, y: 0, yaw: 0 })).toBe(true);
  });
});
