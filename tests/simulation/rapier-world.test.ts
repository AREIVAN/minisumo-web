import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BASE_DOHYO_SPEC,
  PRACTICE_PUSHABLE_OBJECT_SPEC,
  PRACTICE_ROBOT_SPEC,
} from '../../src/domain/index';
import {
  calculateInitialPushableObjectPose,
  calculateInitialRobotPose,
  RapierWorld,
} from '../../src/simulation/physics/rapier-world';

const neutral = { throttle: 0, steering: 0, reset: false } as const;
const forward = { throttle: 1, steering: 0, reset: false } as const;
const rightTurn = { throttle: 0, steering: 1, reset: false } as const;

describe('RapierWorld', () => {
  let simulation: RapierWorld;

  beforeAll(async () => {
    simulation = await RapierWorld.create(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);
  });

  afterAll(() => {
    simulation.dispose();
  });

  it('creates the robot near the inner edge, facing the center, while remaining valid', () => {
    const initial = simulation.snapshot;
    const expectedPose = calculateInitialRobotPose(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);

    expect(initial.pose.x).toBeCloseTo(expectedPose.x);
    expect(initial.pose.y).toBeCloseTo(expectedPose.y);
    expect(initial.pose.yaw).toBeCloseTo(expectedPose.yaw);
    expect(initial.pose.y).toBeGreaterThan(0);
    expect(initial.pose.y).toBeLessThan(BASE_DOHYO_SPEC.innerRadius);
    expect(simulation.isBoundaryOut()).toBe(false);
  });

  it('creates the pushable cylinder in the center, inside the dohyo', () => {
    const initial = simulation.snapshot;
    const expectedPose = calculateInitialPushableObjectPose(
      BASE_DOHYO_SPEC,
      PRACTICE_PUSHABLE_OBJECT_SPEC,
    );

    expect(initial.pushableObject.pose.x).toBeCloseTo(expectedPose.x);
    expect(initial.pushableObject.pose.y).toBeCloseTo(expectedPose.y);
    expect(initial.pushableObject.pose.y).toBeCloseTo(0);
    expect(Math.hypot(initial.pushableObject.pose.x, initial.pushableObject.pose.y)).toBeLessThan(
      BASE_DOHYO_SPEC.innerRadius - PRACTICE_PUSHABLE_OBJECT_SPEC.radius,
    );
    expect(initial.pushableObject.verticalPosition).toBeCloseTo(
      PRACTICE_PUSHABLE_OBJECT_SPEC.height / 2 + 0.002,
    );
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

  it('preserves the edge starting pose after a reset', () => {
    const reset = simulation.reset();
    const expectedPose = calculateInitialRobotPose(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);

    expect(reset.pose.x).toBeCloseTo(expectedPose.x);
    expect(reset.pose.y).toBeCloseTo(expectedPose.y);
    expect(reset.pose.yaw).toBeCloseTo(expectedPose.yaw);
    expect(reset.pose.y).toBeGreaterThan(0);
    expect(reset.pose.y).toBeLessThan(BASE_DOHYO_SPEC.innerRadius);
    expect(simulation.isBoundaryOut()).toBe(false);
  });

  it('lets the robot leave the dohyo and reports the boundary condition', () => {
    simulation.reset();

    for (let step = 0; step < 600; step += 1) {
      simulation.step(forward);
      if (simulation.isBoundaryOut()) break;
    }

    expect(simulation.isBoundaryOut()).toBe(true);
    expect(simulation.snapshot.pose.y).toBeLessThan(-0.33);

    const outHeight = simulation.snapshot.verticalPosition;
    for (let step = 0; step < 240; step += 1) {
      simulation.step(neutral);
    }
    expect(simulation.snapshot.verticalPosition).toBeLessThan(outHeight);
    simulation.halt();
  });

  it('clears stale forces and torques before restarting after an out-of-bounds run', () => {
    simulation.reset();

    for (let step = 0; step < 600; step += 1) {
      simulation.step(forward);
      if (simulation.isBoundaryOut()) break;
    }

    simulation.halt();
    simulation.reset();
    const initial = simulation.snapshot;
    for (let step = 0; step < 30; step += 1) {
      simulation.step(forward);
    }

    const restarted = simulation.snapshot;
    expect(restarted.pose.y).toBeLessThan(initial.pose.y - 0.01);
    expect(Math.abs(restarted.pose.x)).toBeLessThan(0.01);
    expect(restarted.verticalPosition).toBeGreaterThan(0.015);
    expect(restarted.verticalPosition).toBeLessThan(0.08);
    expect(restarted.speed).toBeLessThan(0.5);
  });

  it('uses local -Z as forward and turns right with negative physical yaw', () => {
    simulation.reset();

    for (let step = 0; step < 30; step += 1) {
      simulation.step(forward);
    }

    const forwardSnapshot = simulation.snapshot;
    expect(forwardSnapshot.pose.y).toBeLessThan(
      calculateInitialRobotPose(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC).y - 0.001,
    );

    simulation.reset();
    for (let step = 0; step < 30; step += 1) {
      simulation.step(rightTurn);
    }

    expect(simulation.snapshot.pose.yaw).toBeLessThan(-0.01);
  });

  it('moves the pushable cylinder when the robot reaches and pushes it', () => {
    simulation.reset();
    const initialTargetY = simulation.snapshot.pushableObject.pose.y;

    for (let step = 0; step < 360; step += 1) {
      simulation.step(forward);
    }

    expect(simulation.snapshot.pushableObject.pose.y).toBeLessThan(initialTargetY - 0.005);
  });

  it('halts an out robot and restores it to the starting pose', () => {
    simulation.halt();
    const halted = simulation.snapshot;

    for (let step = 0; step < 20; step += 1) {
      simulation.step(forward);
    }

    expect(simulation.snapshot).toEqual(halted);

    const reset = simulation.reset();
    const expectedPose = calculateInitialRobotPose(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);
    expect(reset.pose.x).toBeCloseTo(expectedPose.x);
    expect(reset.pose.y).toBeCloseTo(expectedPose.y);
    expect(reset.pose.yaw).toBeCloseTo(0);
    expect(reset.verticalPosition).toBeCloseTo(PRACTICE_ROBOT_SPEC.height / 2 + 0.002);
    expect(reset.pushableObject.pose.y).toBeCloseTo(
      calculateInitialPushableObjectPose(BASE_DOHYO_SPEC, PRACTICE_PUSHABLE_OBJECT_SPEC).y,
    );
    expect(reset.pushableObject.verticalPosition).toBeCloseTo(
      PRACTICE_PUSHABLE_OBJECT_SPEC.height / 2 + 0.002,
    );
  });
});
