import { createRobotSpec, type RobotSpec } from './robot-spec';

export const ROBOT_PROFILE = {
  PRACTICE: 'PRACTICE',
} as const;

export type RobotProfile = (typeof ROBOT_PROFILE)[keyof typeof ROBOT_PROFILE];

export const PRACTICE_ROBOT_SPEC = createRobotSpec({
  width: 0.1,
  depth: 0.1,
  height: 0.05,
  mass: 0.5,
});

export const ROBOT_PROFILES: Readonly<Record<RobotProfile, RobotSpec>> = {
  [ROBOT_PROFILE.PRACTICE]: PRACTICE_ROBOT_SPEC,
};
