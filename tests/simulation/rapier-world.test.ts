import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC } from '../../src/domain/index';
import { RapierWorld } from '../../src/simulation/physics/rapier-world';

const neutral = { throttle: 0, steering: 0, reset: false } as const;
const forward = { throttle: 1, steering: 0, reset: false } as const;

describe('RapierWorld', () => {
  let simulation: RapierWorld;

  beforeAll(async () => {
    simulation = await RapierWorld.create(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);
  });

  afterAll(() => {
    simulation.dispose();
  });

  it('keeps the robot supported on the circular floor without a perimeter wall', () => {
    simulation.reset();

    for (let step = 0; step < 60; step += 1) {
      simulation.step(neutral);
    }

    const snapshot = simulation.snapshot;
    expect(snapshot.verticalPosition).toBeGreaterThan(0.015);
    expect(snapshot.verticalPosition).toBeLessThan(0.06);
  });

  it('lets the robot leave the dohyo and reports the boundary condition', () => {
    simulation.reset();

    for (let step = 0; step < 600; step += 1) {
      simulation.step(forward);
      if (simulation.isBoundaryOut()) break;
    }

    expect(simulation.isBoundaryOut()).toBe(true);
    expect(simulation.snapshot.pose.y).toBeGreaterThan(0.33);

    const outHeight = simulation.snapshot.verticalPosition;
    for (let step = 0; step < 240; step += 1) {
      simulation.step(neutral);
    }
    expect(simulation.snapshot.verticalPosition).toBeLessThan(outHeight);
  });

  it('halts an out robot and restores it to the starting pose', () => {
    simulation.halt();
    const halted = simulation.snapshot;

    for (let step = 0; step < 20; step += 1) {
      simulation.step(forward);
    }

    expect(simulation.snapshot).toEqual(halted);

    const reset = simulation.reset();
    expect(reset.pose.x).toBeCloseTo(0);
    expect(reset.pose.y).toBeCloseTo(0);
    expect(reset.pose.yaw).toBeCloseTo(0);
    expect(reset.verticalPosition).toBeCloseTo(PRACTICE_ROBOT_SPEC.height / 2 + 0.002);
  });
});
