export {
  BASE_DOHYO_SPEC,
  BASE_DOHYO_SPEC_INPUT,
  DOHYO_PROFILE,
  DOHYO_PROFILES,
  createDohyoSpec,
} from './arena/dohyo-spec';
export type { DohyoProfile, DohyoSpec, DohyoSpecInput } from './arena/dohyo-spec';

export {
  BOUNDARY_EPSILON,
  BOUNDARY_STATUS,
  BoundaryDetector,
  detectBoundary,
  transformRobotFootprint,
} from './arena/boundary-detector';
export type { BoundaryResult, BoundaryStatus } from './arena/boundary-detector';

export { PRACTICE_ROBOT_SPEC, ROBOT_PROFILE, ROBOT_PROFILES } from './robot/robot-profile';
export type { RobotProfile } from './robot/robot-profile';
export { ROBOT_LIMITS, createRobotSpec } from './robot/robot-spec';
export type { RobotSpec, RobotSpecInput } from './robot/robot-spec';

export {
  INITIAL_PRACTICE_SESSION,
  PRACTICE_EVENT,
  PRACTICE_STATE,
  transitionPracticeState,
} from './session/practice-state';
export type {
  PracticeEvent,
  PracticeEventType,
  PracticeSessionSnapshot,
  PracticeState,
} from './session/practice-state';
export { PracticeSession } from './session/practice-session';

export { NEUTRAL_DRIVE_COMMAND } from './drive-command';
export type { DriveCommand } from './drive-command';

export type { Pose2, Vector2 } from './geometry';
