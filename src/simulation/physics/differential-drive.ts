export interface DifferentialDriveConfig {
  readonly trackWidth: number;
  readonly maxWheelSpeed: number;
  readonly maxYawRate: number;
}

export interface DifferentialWheelSpeeds {
  readonly left: number;
  readonly right: number;
  readonly forwardSpeed: number;
  readonly yawRate: number;
}

export const PRACTICE_DRIVE_CONFIG: DifferentialDriveConfig = {
  trackWidth: 0.072,
  maxWheelSpeed: 0.34,
  maxYawRate: 5.2,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite.`);
  }
}

export function calculateDifferentialWheelSpeeds(
  throttle: number,
  steering: number,
  config: DifferentialDriveConfig = PRACTICE_DRIVE_CONFIG,
): DifferentialWheelSpeeds {
  assertFinite(throttle, 'throttle');
  assertFinite(steering, 'steering');
  assertFinite(config.trackWidth, 'trackWidth');
  assertFinite(config.maxWheelSpeed, 'maxWheelSpeed');
  assertFinite(config.maxYawRate, 'maxYawRate');
  if (config.trackWidth <= 0 || config.maxWheelSpeed <= 0 || config.maxYawRate <= 0) {
    throw new RangeError('drive dimensions and limits must be positive.');
  }

  const normalizedThrottle = clamp(throttle, -1, 1);
  const normalizedSteering = clamp(steering, -1, 1);
  const forwardSpeed = normalizedThrottle * config.maxWheelSpeed;
  const yawRate = normalizedSteering * config.maxYawRate;
  const differential = (yawRate * config.trackWidth) / 2;

  return {
    left: clamp(forwardSpeed - differential, -config.maxWheelSpeed, config.maxWheelSpeed),
    right: clamp(forwardSpeed + differential, -config.maxWheelSpeed, config.maxWheelSpeed),
    forwardSpeed,
    yawRate,
  };
}
