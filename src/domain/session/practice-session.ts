import {
  INITIAL_PRACTICE_SESSION,
  PRACTICE_EVENT,
  PRACTICE_STATE,
  transitionPracticeState,
  type PracticeSessionSnapshot,
  type PracticeState,
} from './practice-state';

export class PracticeSession {
  private snapshot: PracticeSessionSnapshot = INITIAL_PRACTICE_SESSION;

  public get state(): PracticeSessionSnapshot {
    return this.snapshot;
  }

  public get status(): PracticeState {
    return this.snapshot.status;
  }

  public start(): void {
    this.dispatch({ type: PRACTICE_EVENT.START });
  }

  public pause(): void {
    this.dispatch({ type: PRACTICE_EVENT.PAUSE });
  }

  public resume(): void {
    this.dispatch({ type: PRACTICE_EVENT.RESUME });
  }

  public markOut(): void {
    this.dispatch({ type: PRACTICE_EVENT.OUT });
  }

  public reset(): void {
    this.dispatch({ type: PRACTICE_EVENT.RESET });
  }

  public acknowledgeReset(): void {
    this.dispatch({ type: PRACTICE_EVENT.ACKNOWLEDGE_RESET });
  }

  public advance(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new RangeError('seconds must be a non-negative finite number.');
    }

    if (this.status !== PRACTICE_STATE.RUNNING) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      elapsedSeconds: this.snapshot.elapsedSeconds + seconds,
    };
  }

  private dispatch(event: Parameters<typeof transitionPracticeState>[1]): void {
    this.snapshot = transitionPracticeState(this.snapshot, event);
  }
}
