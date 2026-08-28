import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC } from '../../src/domain/index';
import { KeyboardInput } from '../../src/simulation/input/keyboard-input';
import { normalizeKeyboardState } from '../../src/simulation/input/input-source';
import { DEFAULT_KEY_BINDINGS } from '../../src/simulation/input/key-bindings';
import { RapierWorld } from '../../src/simulation/physics/rapier-world';

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

function keyboardEvent(
  key: string,
  repeat = false,
  code = /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key,
): KeyboardEvent {
  return { code, key, repeat, preventDefault: () => undefined } as KeyboardEvent;
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

  it('uses remapped codes and clears held state when the layout changes', () => {
    const target = createFakeKeyboardTarget();
    const input = new KeyboardInput(target, {
      ...DEFAULT_KEY_BINDINGS,
      forward: 'ArrowUp',
    });

    target.listeners.keydown?.(keyboardEvent('ArrowUp', false, 'ArrowUp'));
    expect(input.readCommand().throttle).toBe(1);
    target.listeners.keydown?.(keyboardEvent('w', false, 'KeyW'));
    expect(input.readCommand().throttle).toBe(1);

    input.setKeyBindings(DEFAULT_KEY_BINDINGS);
    expect(input.readCommand()).toEqual({ throttle: 0, steering: 0, reset: false });
    input.dispose();
  });

  it('falls back to W and D when the browser reports an unidentified code', () => {
    const target = createFakeKeyboardTarget();
    const input = new KeyboardInput(target);

    target.listeners.keydown?.(keyboardEvent('w', false, 'Unidentified'));
    target.listeners.keydown?.(keyboardEvent('d', false, 'Unidentified'));
    expect(input.readCommand()).toEqual({ throttle: 1, steering: 1, reset: false });

    target.listeners.keyup?.(keyboardEvent('w', false, 'Unidentified'));
    target.listeners.keyup?.(keyboardEvent('d', false, 'Unidentified'));
    expect(input.readCommand()).toEqual({ throttle: 0, steering: 0, reset: false });
    input.dispose();
  });

  it('falls back to ArrowUp when the browser reports an unidentified code', () => {
    const target = createFakeKeyboardTarget();
    const input = new KeyboardInput(target, {
      ...DEFAULT_KEY_BINDINGS,
      forward: 'ArrowUp',
    });

    target.listeners.keydown?.(keyboardEvent('ArrowUp', false, 'Unidentified'));
    expect(input.readCommand().throttle).toBe(1);

    target.listeners.keyup?.(keyboardEvent('ArrowUp', false, 'Unidentified'));
    expect(input.readCommand()).toEqual({ throttle: 0, steering: 0, reset: false });
    input.dispose();
  });
});

describe('KeyboardInput + RapierWorld', () => {
  let simulation: RapierWorld;

  beforeAll(async () => {
    simulation = await RapierWorld.create(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);
  });

  afterAll(() => {
    simulation.dispose();
  });

  it('moves the robot from a forward command and returns to neutral after release', () => {
    simulation.reset();
    const target = createFakeKeyboardTarget();
    const input = new KeyboardInput(target);
    const initial = simulation.snapshot;

    target.listeners.keydown?.(keyboardEvent('w'));
    const forwardCommand = input.readCommand();

    expect(forwardCommand).toEqual({ throttle: 1, steering: 0, reset: false });
    for (let step = 0; step < 30; step += 1) {
      simulation.step(forwardCommand);
    }

    const moving = simulation.snapshot;
    expect(moving.pose.y).toBeLessThan(initial.pose.y - 0.001);

    target.listeners.keyup?.(keyboardEvent('w'));
    expect(input.readCommand()).toEqual({ throttle: 0, steering: 0, reset: false });
    input.dispose();
  });

  it('keeps logical right positive through keyboard input and physical yaw negative', () => {
    simulation.reset();
    const target = createFakeKeyboardTarget();
    const input = new KeyboardInput(target);
    const initial = simulation.snapshot;

    target.listeners.keydown?.(keyboardEvent('w'));
    target.listeners.keydown?.(keyboardEvent('d'));
    const rightTurnCommand = input.readCommand();

    expect(rightTurnCommand).toEqual({ throttle: 1, steering: 1, reset: false });
    for (let step = 0; step < 30; step += 1) {
      simulation.step(rightTurnCommand);
    }

    const turning = simulation.snapshot;
    expect(turning.pose.y).toBeLessThan(initial.pose.y - 0.001);
    expect(turning.pose.yaw).toBeLessThan(initial.pose.yaw - 0.01);

    input.dispose();
  });

  it('moves the robot backward from the reverse binding', () => {
    simulation.reset();
    const target = createFakeKeyboardTarget();
    const input = new KeyboardInput(target);
    const initial = simulation.snapshot;

    target.listeners.keydown?.(keyboardEvent('s'));
    const reverseCommand = input.readCommand();

    expect(reverseCommand).toEqual({ throttle: -1, steering: 0, reset: false });
    for (let step = 0; step < 30; step += 1) {
      simulation.step(reverseCommand);
    }

    expect(simulation.snapshot.pose.y).toBeGreaterThan(initial.pose.y + 0.01);
    input.dispose();
  });

  it('keeps logical left positive through keyboard input and physical yaw positive', () => {
    simulation.reset();
    const target = createFakeKeyboardTarget();
    const input = new KeyboardInput(target);
    const initial = simulation.snapshot;

    target.listeners.keydown?.(keyboardEvent('a'));
    const leftTurnCommand = input.readCommand();

    expect(leftTurnCommand).toEqual({ throttle: 0, steering: -1, reset: false });
    for (let step = 0; step < 30; step += 1) {
      simulation.step(leftTurnCommand);
    }

    expect(simulation.snapshot.pose.yaw).toBeGreaterThan(initial.pose.yaw + 0.01);
    input.dispose();
  });

  it('moves with a remapped forward binding and neutralizes after release', () => {
    simulation.reset();
    const target = createFakeKeyboardTarget();
    const input = new KeyboardInput(target, { ...DEFAULT_KEY_BINDINGS, forward: 'ArrowUp' });
    const initial = simulation.snapshot;

    target.listeners.keydown?.(keyboardEvent('ArrowUp', false, 'ArrowUp'));
    const forwardCommand = input.readCommand();

    expect(forwardCommand).toEqual({ throttle: 1, steering: 0, reset: false });
    for (let step = 0; step < 30; step += 1) {
      simulation.step(forwardCommand);
    }

    expect(simulation.snapshot.pose.y).toBeLessThan(initial.pose.y - 0.001);

    target.listeners.keyup?.(keyboardEvent('ArrowUp', false, 'ArrowUp'));
    expect(input.readCommand()).toEqual({ throttle: 0, steering: 0, reset: false });
    input.dispose();
  });
});
