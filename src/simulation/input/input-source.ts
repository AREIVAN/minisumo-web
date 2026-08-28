import type { DriveCommand } from '../../domain/drive-command';
import type { KeyBindings } from './key-bindings';

export interface KeyboardState {
  readonly forward: boolean;
  readonly reverse: boolean;
  readonly left: boolean;
  readonly right: boolean;
  readonly reset: boolean;
}

export interface InputSource {
  readCommand(): DriveCommand;
  setKeyBindings?(bindings: KeyBindings): void;
  dispose(): void;
}

export function normalizeKeyboardState(state: KeyboardState): DriveCommand {
  const throttle = Number(state.forward) - Number(state.reverse);
  const steering = Number(state.right) - Number(state.left);

  return { throttle, steering, reset: state.reset };
}
