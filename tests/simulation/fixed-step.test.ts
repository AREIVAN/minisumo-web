import { describe, expect, it } from 'vitest';
import {
  consumeFixedSteps,
  DEFAULT_MAX_SUB_STEPS,
  FIXED_TIME_STEP,
} from '../../src/simulation/fixed-step';

describe('consumeFixedSteps', () => {
  it('accumulates partial frames until one fixed simulation step is ready', () => {
    const halfFrame = consumeFixedSteps({ accumulator: 0 }, FIXED_TIME_STEP / 2);

    expect(halfFrame.steps).toBe(0);
    expect(halfFrame.state.accumulator).toBeCloseTo(FIXED_TIME_STEP / 2);

    const completeFrame = consumeFixedSteps(halfFrame.state, FIXED_TIME_STEP / 2);
    expect(completeFrame.steps).toBe(1);
    expect(completeFrame.state.accumulator).toBeCloseTo(0);
  });

  it('caps a stalled frame and drops the excess backlog', () => {
    const result = consumeFixedSteps({ accumulator: 0 }, 1, FIXED_TIME_STEP);

    expect(result.steps).toBe(DEFAULT_MAX_SUB_STEPS);
    expect(result.state.accumulator).toBeCloseTo(1 % FIXED_TIME_STEP);
    expect(result.state.accumulator).toBeGreaterThanOrEqual(0);
    expect(result.state.accumulator).toBeLessThan(FIXED_TIME_STEP);
  });

  it('clamps a rounding-negative remainder at an exact step boundary', () => {
    const result = consumeFixedSteps({ accumulator: 0.09999999999999999 }, 0, FIXED_TIME_STEP);

    expect(result.steps).toBe(12);
    expect(result.state.accumulator).toBe(0);
    expect(result.interpolationAlpha).toBe(0);
  });

  it('rejects invalid timing parameters', () => {
    expect(() => consumeFixedSteps({ accumulator: 0 }, -1)).toThrow(RangeError);
    expect(() => consumeFixedSteps({ accumulator: 0 }, 0, 0)).toThrow(RangeError);
    expect(() => consumeFixedSteps({ accumulator: 0 }, 0, FIXED_TIME_STEP, 0)).toThrow(RangeError);
  });
});
