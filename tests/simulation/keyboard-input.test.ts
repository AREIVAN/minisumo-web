import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '../../src/simulation/input/keyboard-input';
import { normalizeKeyboardState } from '../../src/simulation/input/input-source';

type KeyboardEventType = 'keydown' | 'keyup' | 'blur';

interface FakeKeyboardTarget {
  readonly listeners: Partial<Record<KeyboardEventType, (event: KeyboardEvent) => void>>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

function createFakeKeyboardTarget(): FakeKeyboardTarget {
  const listeners: FakeKeyboardTarget['listeners'] = {};
  return {
    listeners,
    addEventListener(type, listener) {
      listeners[type as KeyboardEventType] = listener as (event: KeyboardEvent) => void;
    },
    removeEventListener(type) {
      delete listeners[type as KeyboardEventType];
    },
  };
}

function keyboardEvent(key: string, repeat = false): KeyboardEvent {
  return { key, repeat, preventDefault: () => undefined } as KeyboardEvent;
}

describe('normalizeKeyboardState', () => {
  it('maps WASD to a normalized differential-drive command', () => {
    expect(
      normalizeKeyboardState({
        forward: true,
        reverse: false,
        left: true,
        right: false,
        reset: false,
      }),
    ).toEqual({ throttle: 1, steering: -1, reset: false });
  });

  it('cancels opposing keys and preserves reset as a one-shot flag', () => {
    expect(
      normalizeKeyboardState({
        forward: true,
        reverse: true,
        left: true,
        right: true,
        reset: true,
      }),
    ).toEqual({ throttle: 0, steering: 0, reset: true });
  });

  it('tracks held keys and clears the reset flag after it is read', () => {
    const target = createFakeKeyboardTarget();
    const input = new KeyboardInput(target);

    target.listeners.keydown?.(keyboardEvent('w'));
    target.listeners.keydown?.(keyboardEvent('d'));
    target.listeners.keydown?.(keyboardEvent('r'));
    expect(input.readCommand()).toEqual({ throttle: 1, steering: 1, reset: true });
    expect(input.readCommand()).toEqual({ throttle: 1, steering: 1, reset: false });

    target.listeners.keyup?.(keyboardEvent('w'));
    target.listeners.keyup?.(keyboardEvent('d'));
    expect(input.readCommand()).toEqual({ throttle: 0, steering: 0, reset: false });
    input.dispose();
  });
});
