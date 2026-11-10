import { describe, expect, it } from 'vitest';
import { calculatePursuitCommand } from '../../src/simulation/ai/pursuit-controller';

describe('calculatePursuitCommand', () => {
  it('drives forward when the rival is facing the player', () => {
    const command = calculatePursuitCommand(
      { x: 0, y: -0.25, yaw: Math.PI },
      { x: 0, y: 0.25, yaw: 0 },
    );

    expect(command.throttle).toBe(0.5);
    expect(command.steering).toBeCloseTo(0);
    expect(command.reset).toBe(false);
  });

  it("turns right to face a player on the rival's right", () => {
    const command = calculatePursuitCommand({ x: 0, y: 0, yaw: 0 }, { x: 0.25, y: 0, yaw: 0 });

    expect(command.steering).toBeGreaterThan(0);
    expect(command.steering).toBeLessThanOrEqual(0.5);
    expect(command.throttle).toBe(0.15);
  });

  it('returns a neutral command when both robots occupy the same point', () => {
    const command = calculatePursuitCommand({ x: 0, y: 0, yaw: 0 }, { x: 0, y: 0, yaw: Math.PI });

    expect(command).toEqual({ throttle: 0, steering: 0, reset: false });
  });
});
