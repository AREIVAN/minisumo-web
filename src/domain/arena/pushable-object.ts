export interface PushableObjectSpec {
  readonly radius: number;
  readonly height: number;
  readonly mass: number;
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
}

export function createPushableObjectSpec(input: PushableObjectSpec): PushableObjectSpec {
  assertPositiveFinite(input.radius, 'radius');
  assertPositiveFinite(input.height, 'height');
  assertPositiveFinite(input.mass, 'mass');

  return {
    radius: input.radius,
    height: input.height,
    mass: input.mass,
  };
}

/** Small training target placed opposite the robot and simulated as a dynamic body. */
export const PRACTICE_PUSHABLE_OBJECT_SPEC = createPushableObjectSpec({
  radius: 0.035,
  height: 0.04,
  mass: 0.2,
});
