import { describe, expect, it } from 'vitest';
import { normalizeKeyboardState } from '../../src/simulation/input/input-source';

describe('keyboard input normalization', () => {
  it('maps WASD to throttle, steering and reset without DOM access', () => {
    expect(
      normalizeKeyboardState({
        forward: true,
        reverse: false,
        left: true,
        right: false,
        reset: true,
      }),
    ).toEqual({ throttle: 1, steering: -1, reset: true });
  });

  it('cancels opposing keys', () => {
    expect(
      normalizeKeyboardState({
        forward: true,
        reverse: true,
        left: true,
        right: true,
        reset: false,
      }),
    ).toEqual({ throttle: 0, steering: 0, reset: false });
  });
});
