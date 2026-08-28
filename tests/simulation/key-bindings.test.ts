import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KEY_BINDINGS,
  formatKeyCode,
  isValidKeyBindings,
  KEY_BINDINGS_STORAGE_KEY,
  readKeyBindings,
  saveKeyBindings,
  updateKeyBinding,
} from '../../src/simulation/input/key-bindings';

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('key bindings', () => {
  it('accepts a unique movement layout and formats common codes', () => {
    expect(isValidKeyBindings(DEFAULT_KEY_BINDINGS)).toBe(true);
    expect(formatKeyCode('KeyQ')).toBe('Q');
    expect(formatKeyCode('ArrowUp')).toBe('↑');
    expect(formatKeyCode('Digit7')).toBe('7');
  });

  it('rejects duplicates, reset and modifier keys', () => {
    expect(updateKeyBinding(DEFAULT_KEY_BINDINGS, 'forward', 'KeyS')).toBeUndefined();
    expect(updateKeyBinding(DEFAULT_KEY_BINDINGS, 'forward', 'KeyR')).toBeUndefined();
    expect(updateKeyBinding(DEFAULT_KEY_BINDINGS, 'forward', 'ShiftLeft')).toBeUndefined();

    const updated = updateKeyBinding(DEFAULT_KEY_BINDINGS, 'forward', 'ArrowUp');
    expect(updated).toEqual({ ...DEFAULT_KEY_BINDINGS, forward: 'ArrowUp' });
  });

  it('round-trips valid layouts and falls back from invalid storage', () => {
    const storage = createStorage();
    const updated = { ...DEFAULT_KEY_BINDINGS, forward: 'ArrowUp' };

    expect(saveKeyBindings(updated, storage)).toBe(true);
    expect(storage.getItem(KEY_BINDINGS_STORAGE_KEY)).not.toBeNull();
    expect(readKeyBindings(storage)).toEqual(updated);

    storage.setItem(KEY_BINDINGS_STORAGE_KEY, '{invalid json');
    expect(readKeyBindings(storage)).toEqual(DEFAULT_KEY_BINDINGS);
    storage.setItem(
      KEY_BINDINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_KEY_BINDINGS, reverse: 'KeyW' }),
    );
    expect(readKeyBindings(storage)).toEqual(DEFAULT_KEY_BINDINGS);
  });
});
