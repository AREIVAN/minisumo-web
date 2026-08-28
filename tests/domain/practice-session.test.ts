import { describe, expect, it } from 'vitest';
import {
  PRACTICE_EVENT,
  PRACTICE_STATE,
  transitionPracticeState,
  type PracticeSessionSnapshot,
} from '../../src/domain/session/practice-state';
import { PracticeSession } from '../../src/domain/session/practice-session';

describe('PracticeSession', () => {
  it('transitions deterministically through idle, running, paused, out and reset', () => {
    const session = new PracticeSession();

    expect(session.state).toEqual({ status: PRACTICE_STATE.IDLE, elapsedSeconds: 0 });

    session.start();
    session.advance(1.25);
    expect(session.state).toEqual({ status: PRACTICE_STATE.RUNNING, elapsedSeconds: 1.25 });

    session.pause();
    session.advance(1);
    expect(session.status).toBe(PRACTICE_STATE.PAUSED);
    expect(session.state.elapsedSeconds).toBe(1.25);

    session.resume();
    session.markOut();
    expect(session.status).toBe(PRACTICE_STATE.OUT);

    session.reset();
    expect(session.state).toEqual({ status: PRACTICE_STATE.RESET, elapsedSeconds: 0 });

    session.acknowledgeReset();
    expect(session.status).toBe(PRACTICE_STATE.IDLE);
  });

  it('ignores invalid transitions without mutating the snapshot', () => {
    const current: PracticeSessionSnapshot = {
      status: PRACTICE_STATE.IDLE,
      elapsedSeconds: 3,
    };

    expect(transitionPracticeState(current, { type: PRACTICE_EVENT.PAUSE })).toEqual(current);
    expect(transitionPracticeState(current, { type: PRACTICE_EVENT.OUT })).toEqual(current);
  });

  it('rejects non-deterministic time input', () => {
    const session = new PracticeSession();

    expect(() => session.advance(-1)).toThrow(RangeError);
    expect(() => session.advance(Number.NaN)).toThrow(RangeError);
  });
});
