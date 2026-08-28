import { describe, expect, it } from 'vitest';
import {
  calculateDifferentialWheelSpeeds,
  PRACTICE_DRIVE_CONFIG,
} from '../../src/simulation/physics/differential-drive';

describe('calculateDifferentialWheelSpeeds', () => {
  it('keeps both wheels equal while driving straight', () => {
    const result = calculateDifferentialWheelSpeeds(1, 0);

    expect(result.forwardSpeed).toBe(PRACTICE_DRIVE_CONFIG.maxWheelSpeed);
    expect(result.yawRate).toBe(0);
    expect(result.left).toBe(result.right);
  });

  it('reverses the steering differential when the direction reverses', () => {
    const forward = calculateDifferentialWheelSpeeds(1, 1);
    const reverse = calculateDifferentialWheelSpeeds(-1, 1);

    expect(forward.right).toBeGreaterThan(forward.left);
    expect(reverse.right).toBeGreaterThan(reverse.left);
    expect(forward.forwardSpeed).toBe(-reverse.forwardSpeed);
  });

  it('clamps commands to the physical limits', () => {
    const result = calculateDifferentialWheelSpeeds(10, -10);

    expect(result.forwardSpeed).toBe(PRACTICE_DRIVE_CONFIG.maxWheelSpeed);
    expect(result.yawRate).toBe(-PRACTICE_DRIVE_CONFIG.maxYawRate);
    expect(Math.abs(result.left)).toBeLessThanOrEqual(PRACTICE_DRIVE_CONFIG.maxWheelSpeed);
    expect(Math.abs(result.right)).toBeLessThanOrEqual(PRACTICE_DRIVE_CONFIG.maxWheelSpeed);
  });
});
