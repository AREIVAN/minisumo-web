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

  it('maps logical right to physical negative yaw with a faster left wheel', () => {
    const rightTurn = calculateDifferentialWheelSpeeds(1, 1);
    const leftTurn = calculateDifferentialWheelSpeeds(1, -1);

    expect(rightTurn.yawRate).toBe(-PRACTICE_DRIVE_CONFIG.maxYawRate);
    expect(rightTurn.left).toBeGreaterThan(rightTurn.right);
    expect(leftTurn.yawRate).toBe(PRACTICE_DRIVE_CONFIG.maxYawRate);
    expect(leftTurn.right).toBeGreaterThan(leftTurn.left);
  });

  it('clamps commands to the physical limits', () => {
    const result = calculateDifferentialWheelSpeeds(10, -10);

    expect(result.forwardSpeed).toBe(PRACTICE_DRIVE_CONFIG.maxWheelSpeed);
    expect(result.yawRate).toBe(PRACTICE_DRIVE_CONFIG.maxYawRate);
    expect(Math.abs(result.left)).toBeLessThanOrEqual(PRACTICE_DRIVE_CONFIG.maxWheelSpeed);
    expect(Math.abs(result.right)).toBeLessThanOrEqual(PRACTICE_DRIVE_CONFIG.maxWheelSpeed);
  });
});
