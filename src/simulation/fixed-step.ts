export const FIXED_TIME_STEP = 1 / 120;
export const DEFAULT_MAX_SUB_STEPS = 12;

export interface FixedStepState {
  readonly accumulator: number;
}

export interface FixedStepAdvance {
  readonly state: FixedStepState;
  readonly steps: number;
  readonly interpolationAlpha: number;
}

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number.`);
  }
}

export function consumeFixedSteps(
  state: FixedStepState,
  elapsedSeconds: number,
  fixedTimeStep: number = FIXED_TIME_STEP,
  maxSubSteps: number = DEFAULT_MAX_SUB_STEPS,
): FixedStepAdvance {
  assertNonNegativeFinite(state.accumulator, 'accumulator');
  assertNonNegativeFinite(elapsedSeconds, 'elapsedSeconds');
  if (!Number.isFinite(fixedTimeStep) || fixedTimeStep <= 0) {
    throw new RangeError('fixedTimeStep must be a positive finite number.');
  }
  if (!Number.isInteger(maxSubSteps) || maxSubSteps <= 0) {
    throw new RangeError('maxSubSteps must be a positive integer.');
  }

  const accumulated = state.accumulator + elapsedSeconds;
  const requestedSteps = Math.floor(accumulated / fixedTimeStep);
  const steps = Math.min(requestedSteps, maxSubSteps);
  let remainder = accumulated - steps * fixedTimeStep;

  // Drop an excessive backlog instead of simulating an unbounded spiral of death.
  if (requestedSteps > maxSubSteps) {
    remainder %= fixedTimeStep;
  }

  return {
    state: { accumulator: remainder },
    steps,
    interpolationAlpha: remainder / fixedTimeStep,
  };
}
