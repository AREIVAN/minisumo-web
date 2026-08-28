export interface DriveCommand {
  readonly throttle: number;
  readonly steering: number;
  readonly reset: boolean;
}

export const NEUTRAL_DRIVE_COMMAND: DriveCommand = {
  throttle: 0,
  steering: 0,
  reset: false,
};
