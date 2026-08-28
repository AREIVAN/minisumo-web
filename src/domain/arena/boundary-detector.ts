import type { DohyoSpec } from './dohyo-spec';
import type { Pose2, Vector2 } from '../geometry';
import type { RobotSpec } from '../robot/robot-spec';

export const BOUNDARY_STATUS = {
  VALID: 'valid',
  OUT: 'out',
} as const;

export type BoundaryStatus = (typeof BOUNDARY_STATUS)[keyof typeof BOUNDARY_STATUS];

export interface BoundaryResult {
  readonly status: BoundaryStatus;
  readonly isOut: boolean;
  readonly footprint: readonly Vector2[];
  readonly outsidePoints: readonly Vector2[];
}

export const BOUNDARY_EPSILON = 1e-12;

export function transformRobotFootprint(robot: RobotSpec, pose: Pose2): readonly Vector2[] {
  const halfWidth = robot.width / 2;
  const halfDepth = robot.depth / 2;
  const cosine = Math.cos(pose.yaw);
  const sine = Math.sin(pose.yaw);
  const localCorners: readonly Vector2[] = [
    { x: -halfWidth, y: -halfDepth },
    { x: halfWidth, y: -halfDepth },
    { x: halfWidth, y: halfDepth },
    { x: -halfWidth, y: halfDepth },
  ];

  return localCorners.map((corner) => ({
    x: pose.x + corner.x * cosine - corner.y * sine,
    y: pose.y + corner.x * sine + corner.y * cosine,
  }));
}

function assertFinitePose(pose: Pose2): void {
  if (![pose.x, pose.y, pose.yaw].every(Number.isFinite)) {
    throw new RangeError('pose coordinates and yaw must be finite numbers.');
  }
}

function isOutsideBoundary(point: Vector2, outerRadius: number): boolean {
  return Math.hypot(point.x, point.y) > outerRadius + BOUNDARY_EPSILON;
}

export function detectBoundary(dohyo: DohyoSpec, robot: RobotSpec, pose: Pose2): BoundaryResult {
  assertFinitePose(pose);

  const footprint = transformRobotFootprint(robot, pose);
  const outsidePoints = footprint.filter((point) => isOutsideBoundary(point, dohyo.outerRadius));
  const isOut = outsidePoints.length > 0;

  return {
    status: isOut ? BOUNDARY_STATUS.OUT : BOUNDARY_STATUS.VALID,
    isOut,
    footprint,
    outsidePoints,
  };
}

export class BoundaryDetector {
  public constructor(
    private readonly dohyo: DohyoSpec,
    private readonly robot: RobotSpec,
  ) {}

  public evaluate(pose: Pose2): BoundaryResult {
    return detectBoundary(this.dohyo, this.robot, pose);
  }

  public isOut(pose: Pose2): boolean {
    return this.evaluate(pose).isOut;
  }
}
