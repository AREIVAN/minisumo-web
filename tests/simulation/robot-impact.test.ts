import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BASE_DOHYO_SPEC,
  NEUTRAL_DRIVE_COMMAND,
  PRACTICE_ROBOT_SPEC,
} from '../../src/domain/index';
import { RapierWorld, type PhysicsSnapshot } from '../../src/simulation/physics/rapier-world';
import { PRACTICE_DRIVE_CONFIG } from '../../src/simulation/physics/differential-drive';

const forward = { throttle: 1, steering: 0, reset: false } as const;
const MAX_TEST_YAW_ACCELERATION = 2.6;

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function approachAlignment(snapshot: PhysicsSnapshot): number {
  const targetToPlayerX = snapshot.pose.x - snapshot.rival.pose.x;
  const targetToPlayerY = snapshot.pose.y - snapshot.rival.pose.y;
  const separation = Math.hypot(targetToPlayerX, targetToPlayerY);
  const rivalForwardX = -Math.sin(snapshot.rival.pose.yaw);
  const rivalForwardY = -Math.cos(snapshot.rival.pose.yaw);

  return (
    (targetToPlayerX * rivalForwardX + targetToPlayerY * rivalForwardY) / separation
  );
}

function expectSnapshotStable(snapshot: PhysicsSnapshot): void {
  for (const robot of [snapshot, snapshot.rival]) {
    expect([robot.pose.x, robot.pose.y, robot.pose.yaw, robot.speed, robot.yawRate].every(Number.isFinite)).toBe(true);
    expect(Math.abs(robot.pose.x)).toBeLessThan(0.5);
    expect(Math.abs(robot.pose.y)).toBeLessThan(0.5);
    expect(Math.abs(robot.pose.yaw)).toBeLessThanOrEqual(Math.PI);
    expect(robot.speed).toBeLessThanOrEqual(0.52);
    expect(Math.abs(robot.yawRate)).toBeLessThanOrEqual(5.3);
    expect(robot.verticalPosition).toBeGreaterThan(0.015);
    expect(robot.verticalPosition).toBeLessThan(0.04);
  }
}

describe('RapierWorld directional impacts', () => {
  let simulation: RapierWorld;

  beforeAll(async () => {
    simulation = await RapierWorld.create(BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC);
  });

  afterAll(() => {
    simulation.dispose();
  });

  async function alignRivalToYaw(targetYaw: number): Promise<void> {
    for (let step = 0; step < 600; step += 1) {
      const snapshot = simulation.snapshot;
      const yawError = normalizeAngle(targetYaw - snapshot.rival.pose.yaw);
      if (Math.abs(yawError) < 0.01 && Math.abs(snapshot.rival.yawRate) < 0.05) return;

      const desiredYawRate = Math.max(
        -MAX_TEST_YAW_ACCELERATION,
        Math.min(yawError * 4 - snapshot.rival.yawRate * 1.5, MAX_TEST_YAW_ACCELERATION),
      );
      simulation.step(NEUTRAL_DRIVE_COMMAND, {
        throttle: 0,
        steering: -desiredYawRate / PRACTICE_DRIVE_CONFIG.maxYawRate,
        reset: false,
      });
      expectSnapshotStable(simulation.snapshot);
      expect(simulation.getRoundOutcome()).toBeNull();
    }

    simulation.step(NEUTRAL_DRIVE_COMMAND, NEUTRAL_DRIVE_COMMAND);
    const error = normalizeAngle(targetYaw - simulation.snapshot.rival.pose.yaw);
    expect(Math.abs(error)).toBeLessThan(0.02);
    expect(Math.abs(simulation.snapshot.rival.yawRate)).toBeLessThan(0.08);
  }

  async function verifyImpactFrom(targetYaw: number): Promise<void> {
    simulation.reset();
    await alignRivalToYaw(targetYaw);
    const aligned = simulation.snapshot;
    expect(Math.abs(normalizeAngle(targetYaw - aligned.rival.pose.yaw))).toBeLessThan(0.02);
    expect(simulation.getRoundOutcome()).toBeNull();

    let contactSeen = false;
    let postContactSteps = 0;
    let maxRivalImpactSpeed = 0;
    let firstContact: PhysicsSnapshot | undefined;
    for (let step = 0; step < 120; step += 1) {
      const snapshot = simulation.step(forward, NEUTRAL_DRIVE_COMMAND);
      expectSnapshotStable(snapshot);
      expect(simulation.getRoundOutcome()).toBeNull();
      maxRivalImpactSpeed = Math.max(maxRivalImpactSpeed, snapshot.rival.speed);

      if (simulation.hasRobotContact()) {
        firstContact ??= snapshot;
        contactSeen = true;
        postContactSteps += 1;
      } else if (contactSeen) {
        postContactSteps = 0;
      }
      if (postContactSteps >= 12) break;
    }

    expect(contactSeen).toBe(true);
    expect(postContactSteps).toBeGreaterThanOrEqual(12);
    expect(firstContact).toBeDefined();
    expect(
      Math.abs(normalizeAngle(targetYaw - firstContact!.rival.pose.yaw)),
    ).toBeLessThan(0.05);
    const alignment = approachAlignment(firstContact!);
    if (targetYaw === Math.PI / 2) {
      // The attacking robot reaches a side, not the front or rear face.
      expect(Math.abs(alignment)).toBeLessThan(0.4);
    } else {
      // The rival faces away, so the incoming direction is opposite its front.
      expect(alignment).toBeLessThan(-0.7);
    }
    expect(maxRivalImpactSpeed).toBeGreaterThan(0.02);
    expect(simulation.getRoundOutcome()).toBeNull();
  }

  it('keeps a lateral collision stable and supported', async () => {
    // Rival faces sideways, exposing its side to the player's straight attack.
    await verifyImpactFrom(Math.PI / 2);
  });

  it('keeps a rear collision stable and supported', async () => {
    // Rival faces away from the player, so the attack reaches its rear.
    await verifyImpactFrom(0);
  });
});
