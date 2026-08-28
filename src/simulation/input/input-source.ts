import type { DriveCommand } from '../../domain/drive-command';

export interface KeyboardState {
  readonly forward: boolean;
  readonly reverse: boolean;
  readonly left: boolean;
  readonly right: boolean;
  readonly reset: boolean;
}

export interface InputSource {
  readCommand(): DriveCommand;
  dispose(): void;
}

export function normalizeKeyboardState(state: KeyboardState): DriveCommand {
  const throttle = Number(state.forward) - Number(state.reverse);
  const steering = Number(state.right) - Number(state.left);

  return { throttle, steering, reset: state.reset };
}
