import { describe, expect, it } from 'vitest';
import { BASE_DOHYO_SPEC, createDohyoSpec } from '../../src/domain/arena/dohyo-spec';

describe('DohyoSpec', () => {
  it('exposes the base profile in SI units and derives both radii', () => {
    expect(BASE_DOHYO_SPEC).toEqual({
      outerDiameter: 0.77,
      tawaraWidth: 0.025,
      height: 0.025,
      outerRadius: 0.385,
      innerRadius: 0.36,
    });
  });

  it('derives radii for a custom valid specification', () => {
    expect(createDohyoSpec({ outerDiameter: 1, tawaraWidth: 0.05 })).toEqual({
      outerDiameter: 1,
      tawaraWidth: 0.05,
      height: 0.025,
      outerRadius: 0.5,
      innerRadius: 0.45,
    });
  });
});
