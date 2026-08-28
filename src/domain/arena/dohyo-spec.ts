export interface DohyoSpec {
  readonly outerDiameter: number;
  readonly tawaraWidth: number;
  readonly height: number;
  readonly outerRadius: number;
  readonly innerRadius: number;
}

export interface DohyoSpecInput {
  readonly outerDiameter: number;
  readonly tawaraWidth: number;
  readonly height?: number;
}

export const DOHYO_PROFILE = {
  BASE: 'BASE',
} as const;

export type DohyoProfile = (typeof DOHYO_PROFILE)[keyof typeof DOHYO_PROFILE];

export const BASE_DOHYO_SPEC_INPUT = {
  outerDiameter: 0.77,
  tawaraWidth: 0.025,
  height: 0.025,
} as const satisfies DohyoSpecInput;

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
}

export function createDohyoSpec(input: DohyoSpecInput = BASE_DOHYO_SPEC_INPUT): DohyoSpec {
  assertPositiveFinite(input.outerDiameter, 'outerDiameter');
  assertPositiveFinite(input.tawaraWidth, 'tawaraWidth');
  const height = input.height ?? 0.025;
  assertPositiveFinite(height, 'height');

  const outerRadius = input.outerDiameter / 2;

  if (input.tawaraWidth >= outerRadius) {
    throw new RangeError('tawaraWidth must be smaller than the outer radius.');
  }

  return {
    outerDiameter: input.outerDiameter,
    tawaraWidth: input.tawaraWidth,
    height,
    outerRadius,
    innerRadius: outerRadius - input.tawaraWidth,
  };
}

export const BASE_DOHYO_SPEC = createDohyoSpec(BASE_DOHYO_SPEC_INPUT);

export const DOHYO_PROFILES: Readonly<Record<DohyoProfile, DohyoSpec>> = {
  [DOHYO_PROFILE.BASE]: BASE_DOHYO_SPEC,
};
