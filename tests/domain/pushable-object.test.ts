import { describe, expect, it } from 'vitest';
import { PRACTICE_PUSHABLE_OBJECT_SPEC, createPushableObjectSpec } from '../../src/domain/index';

describe('pushable object spec', () => {
  it('defines a compact cylindrical practice target', () => {
    expect(PRACTICE_PUSHABLE_OBJECT_SPEC).toEqual({
      radius: 0.035,
      height: 0.04,
      mass: 0.2,
    });
  });

  it('rejects non-positive dimensions and mass', () => {
    expect(() => createPushableObjectSpec({ radius: 0, height: 0.04, mass: 0.2 })).toThrow(
      'radius must be a positive finite number.',
    );
    expect(() => createPushableObjectSpec({ radius: 0.035, height: -1, mass: 0.2 })).toThrow(
      'height must be a positive finite number.',
    );
    expect(() => createPushableObjectSpec({ radius: 0.035, height: 0.04, mass: Infinity })).toThrow(
      'mass must be a positive finite number.',
    );
  });
});
