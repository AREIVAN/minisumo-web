export const ROBOT_LIMITS = {
  MAX_WIDTH: 0.1,
  MAX_DEPTH: 0.1,
  MAX_MASS: 0.5,
} as const;

export interface RobotSpec {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly mass: number;
}

export interface RobotSpecInput {
  readonly width: number;
  readonly depth: number;
  readonly height?: number;
  readonly mass?: number;
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
}

export function createRobotSpec(input: RobotSpecInput): RobotSpec {
  assertPositiveFinite(input.width, 'width');
  assertPositiveFinite(input.depth, 'depth');

  if (input.width > ROBOT_LIMITS.MAX_WIDTH) {
    throw new RangeError('width cannot exceed 0.1 m.');
  }

  if (input.depth > ROBOT_LIMITS.MAX_DEPTH) {
    throw new RangeError('depth cannot exceed 0.1 m.');
  }

  const height = input.height ?? 0.05;
  const mass = input.mass ?? ROBOT_LIMITS.MAX_MASS;
  assertPositiveFinite(height, 'height');
  assertPositiveFinite(mass, 'mass');

  if (mass > ROBOT_LIMITS.MAX_MASS) {
    throw new RangeError('mass cannot exceed 0.5 kg.');
  }

  return {
    width: input.width,
    depth: input.depth,
    height,
    mass,
  };
}
