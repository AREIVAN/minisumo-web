import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BASE_DOHYO_SPEC,
  createDohyoSpec,
  NEUTRAL_DRIVE_COMMAND,
  PRACTICE_ROBOT_SPEC,
  PRACTICE_PUSHABLE_OBJECT_SPEC,
  PRACTICE_RIVAL_TYPE,
  ROUND_OUTCOME,
} from '../../src/domain/index';
import {
  calculateInitialRivalPose,
  calculateInitialRobotPose,
  RapierWorld,
  START_LINE_OFFSET,
} from '../../src/simulation/physics/rapier-world';
import { calculatePursuitCommand } from '../../src/simulation/ai/pursuit-controller';
import { PRACTICE_DRIVE_CONFIG } from '../../src/simulation/physics/differential-drive';

const forward = { throttle: 1, steering: 0, reset: false } as const;
const reverse = { throttle: -1, steering: 0, reset: false } as const;
const rightTurn = { throttle: 0, steering: 1, reset: false } as const;

describe('RapierWorld', () => {
  let simulation: RapierWorld;

  beforeAll(async () => {
    simulation = await RapierWorld.create(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);
  });

  afterAll(() => {
    simulation.dispose();
  });

  it('starts the player and rival opposite each other, facing the center', () => {
    const initial = simulation.snapshot;
    const playerPose = calculateInitialRobotPose(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);
    const rivalPose = calculateInitialRivalPose(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);

    expect(initial.pose.x).toBeCloseTo(playerPose.x);
    expect(initial.pose.y).toBeCloseTo(playerPose.y);
    expect(initial.pose.yaw).toBeCloseTo(playerPose.yaw);
    expect(initial.rival.pose.x).toBeCloseTo(rivalPose.x);
    expect(initial.rival.pose.y).toBeCloseTo(rivalPose.y);
    expect(initial.rival.pose.yaw).toBeCloseTo(rivalPose.yaw);
    expect(playerPose.y).toBeCloseTo(START_LINE_OFFSET + PRACTICE_ROBOT_SPEC.depth / 2);
    expect(playerPose.y - PRACTICE_ROBOT_SPEC.depth / 2).toBeCloseTo(START_LINE_OFFSET);
    expect(-rivalPose.y - PRACTICE_ROBOT_SPEC.depth / 2).toBeCloseTo(START_LINE_OFFSET);
    expect(playerPose.y - rivalPose.y).toBeGreaterThan(PRACTICE_ROBOT_SPEC.depth);
    expect(simulation.getRoundOutcome()).toBeNull();
  });

  it('rejects a dohyo too small to contain the farthest starting-pose corner', () => {
    const smallDohyo = createDohyoSpec({ outerDiameter: 0.3, tawaraWidth: 0.025 });

    expect(() => calculateInitialRobotPose(smallDohyo, PRACTICE_ROBOT_SPEC)).toThrow(
      'dohyo is too small for the official starting pose.',
    );
  });

  it('keeps both robots supported by the circular floor', () => {
    simulation.reset();

    for (let step = 0; step < 60; step += 1) {
      simulation.step(NEUTRAL_DRIVE_COMMAND);
    }

    const snapshot = simulation.snapshot;
    expect(snapshot.verticalPosition).toBeGreaterThan(0.015);
    expect(snapshot.verticalPosition).toBeLessThan(0.06);
    expect(snapshot.rival.verticalPosition).toBeGreaterThan(0.015);
    expect(snapshot.rival.verticalPosition).toBeLessThan(0.06);
    expect(simulation.getRoundOutcome()).toBeNull();
  });

  it('restores both starting poses after a reset', () => {
    simulation.reset();
    const expectedPlayer = calculateInitialRobotPose(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);
    const expectedRival = calculateInitialRivalPose(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);

    expect(simulation.snapshot.pose.x).toBeCloseTo(expectedPlayer.x);
    expect(simulation.snapshot.pose.y).toBeCloseTo(expectedPlayer.y);
    expect(simulation.snapshot.pose.yaw).toBeCloseTo(expectedPlayer.yaw);
    expect(simulation.snapshot.rival.pose.x).toBeCloseTo(expectedRival.x);
    expect(simulation.snapshot.rival.pose.y).toBeCloseTo(expectedRival.y);
    expect(simulation.snapshot.rival.pose.yaw).toBeCloseTo(expectedRival.yaw);
    expect(simulation.getRoundOutcome()).toBeNull();
  });

  it('activates the selected physical cylinder and keeps it supported on the dohyo', () => {
    const initial = simulation.setRivalType(PRACTICE_RIVAL_TYPE.CYLINDER);
    expect(initial.rivalType).toBe(PRACTICE_RIVAL_TYPE.CYLINDER);
    expect(initial.rival.pose.x).toBeCloseTo(0);
    expect(initial.rival.pose.y).toBeCloseTo(0);
    expect(initial.rival.verticalPosition).toBeCloseTo(PRACTICE_PUSHABLE_OBJECT_SPEC.height / 2);

    simulation.reset();
    expect(simulation.snapshot.rivalType).toBe(PRACTICE_RIVAL_TYPE.CYLINDER);
    expect(simulation.snapshot.rival.pose.x).toBeCloseTo(0);
    expect(simulation.snapshot.rival.pose.y).toBeCloseTo(0);

    let snapshot = simulation.snapshot;
    for (let step = 0; step < 60; step += 1) {
      snapshot = simulation.step(NEUTRAL_DRIVE_COMMAND);
    }

    expect(snapshot.rival.verticalPosition).toBeCloseTo(PRACTICE_PUSHABLE_OBJECT_SPEC.height / 2);
    expect(Number.isFinite(snapshot.rival.speed)).toBe(true);
    expect(simulation.getRoundOutcome()).toBeNull();
    simulation.setRivalType(PRACTICE_RIVAL_TYPE.MINISUMO);
    simulation.reset();
  });

  it('halts the active cylinder and leaves no residual motion over later steps', () => {
    simulation.setRivalType(PRACTICE_RIVAL_TYPE.CYLINDER);
    simulation.reset();
    let contactObserved = false;
    for (let step = 0; step < 30; step += 1) {
      simulation.step(forward);
      contactObserved ||= simulation.hasRivalContact();
    }

    const moving = simulation.snapshot;
    expect(contactObserved).toBe(true);
    expect(moving.rival.speed).toBeGreaterThan(0.001);

    simulation.halt();
    const halted = simulation.snapshot;
    expect(halted.rival.speed).toBeCloseTo(0);
    for (let step = 0; step < 12; step += 1) {
      simulation.step(NEUTRAL_DRIVE_COMMAND);
    }

    expect(simulation.snapshot.rival.speed).toBeCloseTo(0);
    expect(simulation.snapshot.rival.pose.x).toBeCloseTo(halted.rival.pose.x);
    expect(simulation.snapshot.rival.pose.y).toBeCloseTo(halted.rival.pose.y);
    simulation.setRivalType(PRACTICE_RIVAL_TYPE.MINISUMO);
    simulation.reset();
  });

  it('lets the player physically push the cylinder, which scores only after fully leaving', () => {
    simulation.setRivalType(PRACTICE_RIVAL_TYPE.CYLINDER);
    simulation.reset();
    let contactObserved = false;
    let outcome = null;
    let finalSnapshot = simulation.snapshot;
    const fullExitDistance = BASE_DOHYO_SPEC.outerRadius + PRACTICE_PUSHABLE_OBJECT_SPEC.radius;

    for (let step = 0; step < 720; step += 1) {
      finalSnapshot = simulation.step(forward);
      contactObserved ||= simulation.hasRivalContact();
      const cylinderDistance = Math.hypot(finalSnapshot.rival.pose.x, finalSnapshot.rival.pose.y);
      outcome = simulation.getRoundOutcome();
      if (cylinderDistance <= fullExitDistance) {
        expect(outcome).toBeNull();
      }
      if (outcome) break;
    }

    expect(contactObserved).toBe(true);
    expect(outcome).toBe(ROUND_OUTCOME.PLAYER_SCORES);
    expect(Math.hypot(finalSnapshot.rival.pose.x, finalSnapshot.rival.pose.y)).toBeGreaterThan(
      fullExitDistance,
    );
    expect(Number.isFinite(finalSnapshot.rival.pose.x)).toBe(true);
    expect(Number.isFinite(finalSnapshot.rival.pose.y)).toBe(true);
    simulation.setRivalType(PRACTICE_RIVAL_TYPE.MINISUMO);
    simulation.reset();
  });

  it('moves the rival when it receives a pursuit command', () => {
    simulation.reset();
    const initialY = simulation.snapshot.rival.pose.y;

    for (let step = 0; step < 30; step += 1) {
      simulation.step(NEUTRAL_DRIVE_COMMAND, forward);
    }

    expect(simulation.snapshot.rival.pose.y).toBeGreaterThan(initialY + 0.01);
  });

  it('keeps the robot-to-robot collision finite while the slower rival attacks', () => {
    simulation.reset();
    let maxPlayerSpeed = 0;
    let maxRivalSpeed = 0;

    for (let step = 0; step < 90; step += 1) {
      const beforeStep = simulation.snapshot;
      const rivalCommand = calculatePursuitCommand(beforeStep.rival.pose, beforeStep.pose);
      const snapshot = simulation.step(forward, rivalCommand);
      maxPlayerSpeed = Math.max(maxPlayerSpeed, snapshot.speed);
      maxRivalSpeed = Math.max(maxRivalSpeed, snapshot.rival.speed);
    }

    const snapshot = simulation.snapshot;
    const centerDistance = Math.hypot(
      snapshot.pose.x - snapshot.rival.pose.x,
      snapshot.pose.y - snapshot.rival.pose.y,
    );
    expect(centerDistance).toBeLessThan(0.4);
    expect(Number.isFinite(snapshot.speed)).toBe(true);
    expect(Number.isFinite(snapshot.rival.speed)).toBe(true);
    expect(maxPlayerSpeed).toBeLessThanOrEqual(PRACTICE_DRIVE_CONFIG.maxWheelSpeed * 1.5 + 0.001);
    expect(maxRivalSpeed).toBeLessThanOrEqual(
      PRACTICE_DRIVE_CONFIG.maxWheelSpeed * 0.5 * 1.5 + 0.001,
    );
    expect(simulation.getRoundOutcome()).toBeNull();
  });

  it('does not launch a supported robot upward during a head-on collision', () => {
    simulation.reset();
    let maxPlayerHeight = simulation.snapshot.verticalPosition;
    let maxRivalHeight = simulation.snapshot.rival.verticalPosition;

    for (let step = 0; step < 240; step += 1) {
      const beforeStep = simulation.snapshot;
      const rivalCommand = calculatePursuitCommand(beforeStep.rival.pose, beforeStep.pose);
      const snapshot = simulation.step(forward, rivalCommand);
      maxPlayerHeight = Math.max(maxPlayerHeight, snapshot.verticalPosition);
      maxRivalHeight = Math.max(maxRivalHeight, snapshot.rival.verticalPosition);
      if (simulation.getRoundOutcome()) break;
    }

    // A grounded chassis starts at 0.027 m. A ramp collision previously
    // produced a 2.54 m/s vertical impulse, lifting one robot clear of the mat.
    expect(maxPlayerHeight).toBeLessThan(0.04);
    expect(maxRivalHeight).toBeLessThan(0.04);
  });

  it('keeps the rival supported after a near-edge collision ejects the player', () => {
    simulation.reset();
    let maxRivalHeight = simulation.snapshot.rival.verticalPosition;
    let resolved = false;

    // Move the player near the outer edge without fully clearing the dohyo.
    for (let step = 0; step < 90; step += 1) {
      simulation.step(reverse);
    }
    expect(simulation.getRoundOutcome()).toBeNull();

    // The rival then approaches and collides while the player is still only
    // partially over the edge. The surviving robot must remain on the mat.
    for (let step = 0; step < 180; step += 1) {
      const snapshot = simulation.step(NEUTRAL_DRIVE_COMMAND, forward);
      const outcome = simulation.getRoundOutcome();

      if (!outcome || outcome === ROUND_OUTCOME.RIVAL_SCORES) {
        maxRivalHeight = Math.max(maxRivalHeight, snapshot.rival.verticalPosition);
      }
      if (outcome) {
        resolved = true;
        break;
      }
    }

    expect(resolved).toBe(true);
    expect(simulation.getRoundOutcome()).toBe(ROUND_OUTCOME.RIVAL_SCORES);
    // A robot can only fall after its full footprint has exited and the point
    // is awarded; the still-scoring rival must stay in the dohyo plane.
    expect(maxRivalHeight).toBeLessThan(0.04);
  });

  it('lets the full-speed player win a direct attack against the slower rival', () => {
    simulation.reset();

    for (let step = 0; step < 720; step += 1) {
      const beforeStep = simulation.snapshot;
      const rivalCommand = calculatePursuitCommand(beforeStep.rival.pose, beforeStep.pose);
      simulation.step(forward, rivalCommand);
      if (simulation.getRoundOutcome()) break;
    }

    expect(simulation.getRoundOutcome()).toBe(ROUND_OUTCOME.PLAYER_SCORES);
  });

  it('limits collision-induced turning so contact does not spin either chassis wildly', () => {
    simulation.reset();
    let maxPlayerYawRate = 0;
    let maxRivalYawRate = 0;

    for (let step = 0; step < 240; step += 1) {
      const beforeStep = simulation.snapshot;
      const rivalCommand = calculatePursuitCommand(beforeStep.rival.pose, beforeStep.pose);
      const snapshot = simulation.step(forward, rivalCommand);
      maxPlayerYawRate = Math.max(maxPlayerYawRate, Math.abs(snapshot.yawRate));
      maxRivalYawRate = Math.max(maxRivalYawRate, Math.abs(snapshot.rival.yawRate));
      if (simulation.getRoundOutcome()) break;
    }

    expect(maxPlayerYawRate).toBeLessThanOrEqual(PRACTICE_DRIVE_CONFIG.maxYawRate * 0.25 + 0.001);
    expect(maxRivalYawRate).toBeLessThanOrEqual(PRACTICE_DRIVE_CONFIG.maxYawRate * 0.5 + 0.001);
  });

  it('awards the rival only after the whole player footprint leaves the dohyo', () => {
    simulation.reset();

    for (let step = 0; step < 600; step += 1) {
      simulation.step(reverse);
      if (simulation.getRoundOutcome()) break;
    }

    expect(simulation.getRoundOutcome()).toBe(ROUND_OUTCOME.RIVAL_SCORES);
    expect(Math.abs(simulation.snapshot.pose.y)).toBeGreaterThan(
      BASE_DOHYO_SPEC.outerRadius + PRACTICE_ROBOT_SPEC.width / 2,
    );

    const outHeight = simulation.snapshot.verticalPosition;
    for (let step = 0; step < 240; step += 1) {
      simulation.step(NEUTRAL_DRIVE_COMMAND);
    }
    expect(simulation.snapshot.verticalPosition).toBeLessThan(outHeight);
    simulation.halt();
  });

  it('awards the player when the rival leaves the dohyo', () => {
    simulation.reset();

    for (let step = 0; step < 600; step += 1) {
      simulation.step(NEUTRAL_DRIVE_COMMAND, reverse);
      if (simulation.getRoundOutcome()) break;
    }

    expect(simulation.getRoundOutcome()).toBe(ROUND_OUTCOME.PLAYER_SCORES);
    expect(Math.abs(simulation.snapshot.rival.pose.y)).toBeGreaterThan(
      BASE_DOHYO_SPEC.outerRadius + PRACTICE_ROBOT_SPEC.width / 2,
    );
    simulation.halt();
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
    expect(simulation.snapshot.yawRate).toBeLessThan(-3);
  });

  it('holds a steady straight-line speed without uncommanded yaw', () => {
    simulation.reset();
    const initialPose = simulation.snapshot.pose;

    for (let step = 0; step < 30; step += 1) {
      simulation.step(forward);
    }

    const snapshot = simulation.snapshot;
    expect(snapshot.speed).toBeGreaterThan(0.3);
    expect(snapshot.pose.y).toBeLessThan(initialPose.y - 0.05);
    expect(Math.abs(snapshot.pose.x)).toBeLessThan(0.005);
    expect(Math.abs(snapshot.pose.yaw)).toBeLessThan(0.01);
    expect(Math.abs(snapshot.yawRate)).toBeLessThan(0.1);
  });

  it('clears stale forces and torques before restarting after an out', () => {
    simulation.reset();

    for (let step = 0; step < 600; step += 1) {
      simulation.step(reverse);
      if (simulation.getRoundOutcome()) break;
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

  it('halts both robots until the next reset', () => {
    simulation.halt();
    const halted = simulation.snapshot;

    for (let step = 0; step < 20; step += 1) {
      simulation.step(forward, forward);
    }

    expect(simulation.snapshot).toEqual(halted);

    const reset = simulation.reset();
    const expectedPlayer = calculateInitialRobotPose(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);
    const expectedRival = calculateInitialRivalPose(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);
    expect(reset.pose.x).toBeCloseTo(expectedPlayer.x);
    expect(reset.pose.y).toBeCloseTo(expectedPlayer.y);
    expect(reset.rival.pose.x).toBeCloseTo(expectedRival.x);
    expect(reset.rival.pose.y).toBeCloseTo(expectedRival.y);
    expect(reset.verticalPosition).toBeCloseTo(PRACTICE_ROBOT_SPEC.height / 2 + 0.002);
    expect(reset.rival.verticalPosition).toBeCloseTo(PRACTICE_ROBOT_SPEC.height / 2 + 0.002);
  });
});
