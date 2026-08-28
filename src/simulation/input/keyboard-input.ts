import type { DriveCommand } from '../../domain/drive-command';
import type { InputSource, KeyboardState } from './input-source';
import { normalizeKeyboardState } from './input-source';
import {
  DEFAULT_KEY_BINDINGS,
  isValidKeyBindings,
  MOVEMENT_ACTION,
  type KeyBindings,
} from './key-bindings';

type KeyboardTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

function codeFromEvent(event: KeyboardEvent): string {
  if (event.code && event.code !== 'Unidentified') return event.code;
  const key = event.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^\d$/.test(key)) return `Digit${key}`;
  return event.key;
}

export class KeyboardInput implements InputSource {
  private bindings: KeyBindings;
  private state: KeyboardState = {
    forward: false,
    reverse: false,
    left: false,
    right: false,
    reset: false,
  };

  private readonly onKeyDownBound = (event: KeyboardEvent): void => {
    const code = codeFromEvent(event);
    if (this.isMovementCode(code) || code === 'KeyR') {
      event.preventDefault();
    }

    if (code === this.bindings.forward) this.state = { ...this.state, forward: true };
    if (code === this.bindings.reverse) this.state = { ...this.state, reverse: true };
    if (code === this.bindings.left) this.state = { ...this.state, left: true };
    if (code === this.bindings.right) this.state = { ...this.state, right: true };
    if (code === 'KeyR' && !event.repeat) this.state = { ...this.state, reset: true };
  };

  private readonly onKeyUpBound = (event: KeyboardEvent): void => {
    const code = codeFromEvent(event);
    if (code === this.bindings.forward) this.state = { ...this.state, forward: false };
    if (code === this.bindings.reverse) this.state = { ...this.state, reverse: false };
    if (code === this.bindings.left) this.state = { ...this.state, left: false };
    if (code === this.bindings.right) this.state = { ...this.state, right: false };
  };

  private readonly onBlurBound = (): void => {
    this.clearHeldKeys();
  };

  public constructor(
    private readonly target: KeyboardTarget = window,
    bindings: KeyBindings = DEFAULT_KEY_BINDINGS,
  ) {
    if (!isValidKeyBindings(bindings)) {
      throw new RangeError('Keyboard bindings must contain four unique, bindable keys.');
    }
    this.bindings = bindings;
    target.addEventListener('keydown', this.onKeyDownBound);
    target.addEventListener('keyup', this.onKeyUpBound);
    target.addEventListener('blur', this.onBlurBound);
  }

  public readCommand(): DriveCommand {
    const command = normalizeKeyboardState(this.state);
    this.state = { ...this.state, reset: false };
    return command;
  }

  public setKeyBindings(bindings: KeyBindings): void {
    if (!isValidKeyBindings(bindings)) {
      throw new RangeError('Keyboard bindings must contain four unique, bindable keys.');
    }
    this.bindings = bindings;
    this.clearHeldKeys();
  }

  public get keyBindings(): KeyBindings {
    return this.bindings;
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

  private isMovementCode(code: string): boolean {
    return (
      code === this.bindings[MOVEMENT_ACTION.FORWARD] ||
      code === this.bindings[MOVEMENT_ACTION.REVERSE] ||
      code === this.bindings[MOVEMENT_ACTION.LEFT] ||
      code === this.bindings[MOVEMENT_ACTION.RIGHT]
    );
  }
}
