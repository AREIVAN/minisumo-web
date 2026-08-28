import type { DriveCommand } from '../../domain/drive-command';
import type { InputSource, KeyboardState } from './input-source';
import { normalizeKeyboardState } from './input-source';

type KeyboardTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

const CONTROL_KEYS = new Set(['w', 's', 'a', 'd']);

function keyFromEvent(event: KeyboardEvent): string {
  return event.key.toLowerCase();
}

export class KeyboardInput implements InputSource {
  private state: KeyboardState = {
    forward: false,
    reverse: false,
    left: false,
    right: false,
    reset: false,
  };

  private readonly onKeyDownBound = (event: KeyboardEvent): void => {
    const key = keyFromEvent(event);
    if (CONTROL_KEYS.has(key) || key === 'r') {
      event.preventDefault();
    }

    if (key === 'w') this.state = { ...this.state, forward: true };
    if (key === 's') this.state = { ...this.state, reverse: true };
    if (key === 'a') this.state = { ...this.state, left: true };
    if (key === 'd') this.state = { ...this.state, right: true };
    if (key === 'r' && !event.repeat) this.state = { ...this.state, reset: true };
  };

  private readonly onKeyUpBound = (event: KeyboardEvent): void => {
    const key = keyFromEvent(event);
    if (key === 'w') this.state = { ...this.state, forward: false };
    if (key === 's') this.state = { ...this.state, reverse: false };
    if (key === 'a') this.state = { ...this.state, left: false };
    if (key === 'd') this.state = { ...this.state, right: false };
  };

  private readonly onBlurBound = (): void => {
    this.clearHeldKeys();
  };

  public constructor(private readonly target: KeyboardTarget = window) {
    target.addEventListener('keydown', this.onKeyDownBound);
    target.addEventListener('keyup', this.onKeyUpBound);
    target.addEventListener('blur', this.onBlurBound);
  }

  public readCommand(): DriveCommand {
    const command = normalizeKeyboardState(this.state);
    this.state = { ...this.state, reset: false };
    return command;
  }

  public dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDownBound);
    this.target.removeEventListener('keyup', this.onKeyUpBound);
    this.target.removeEventListener('blur', this.onBlurBound);
    this.clearHeldKeys();
  }

  private clearHeldKeys(): void {
    this.state = {
      forward: false,
      reverse: false,
      left: false,
      right: false,
      reset: false,
    };
  }
}
