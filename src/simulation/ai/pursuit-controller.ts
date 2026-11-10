import { NEUTRAL_DRIVE_COMMAND, type DriveCommand, type Pose2 } from '../../domain/index';
import { RIVAL_SPEED_SCALE } from '../drive-tuning';

const MAX_STEERING_ANGLE = 1.1;
const TURNING_THRESHOLD = 0.9;
export { RIVAL_SPEED_SCALE } from '../drive-tuning';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** A baseline rival controller that steers toward and drives at the player. */
export function calculatePursuitCommand(rival: Pose2, player: Pose2): DriveCommand {
  const deltaX = player.x - rival.x;
  const deltaY = player.y - rival.y;
  if (Math.hypot(deltaX, deltaY) < 1e-9) return NEUTRAL_DRIVE_COMMAND;

  // The robot's nose points along local -Z, so this converts a world-space
  // target vector into the matching physical yaw angle.
  const targetYaw = Math.atan2(-deltaX, -deltaY);
  const yawError = wrapAngle(targetYaw - rival.yaw);

  return {
    throttle: (Math.abs(yawError) > TURNING_THRESHOLD ? 0.3 : 1) * RIVAL_SPEED_SCALE,
    steering: clamp(-yawError / MAX_STEERING_ANGLE, -1, 1) * RIVAL_SPEED_SCALE,
    reset: false,
  };
}
