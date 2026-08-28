import { describe, expect, it } from 'vitest';
import { PRACTICE_ROBOT_SPEC } from '../../src/domain/robot/robot-profile';
import { createRobotSpec } from '../../src/domain/robot/robot-spec';

describe('RobotSpec', () => {
  it('provides a rule-conforming practice profile', () => {
    expect(PRACTICE_ROBOT_SPEC).toEqual({
      width: 0.1,
      depth: 0.1,
      height: 0.05,
      mass: 0.5,
    });
  });

  it.each([
    { width: 0, depth: 0.1 },
    { width: 0.101, depth: 0.1 },
    { width: 0.1, depth: 0.101 },
    { width: 0.1, depth: -0.01 },
  ])('rejects invalid footprint dimensions: %o', (input) => {
    expect(() => createRobotSpec(input)).toThrow(RangeError);
  });
});
