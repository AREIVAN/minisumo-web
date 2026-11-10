import { describe, expect, it } from 'vitest';
import {
  PRACTICE_EVENT,
  PRACTICE_STATE,
  PRACTICE_RIVAL_TYPE,
  ROUND_OUTCOME,
  transitionPracticeState,
  type PracticeSessionSnapshot,
} from '../../src/domain/session/practice-state';
import { PracticeSession } from '../../src/domain/session/practice-session';

describe('PracticeSession', () => {
  it('scores one completed round and carries the score into the next round', () => {
    const session = new PracticeSession();

    expect(session.state).toEqual({
      status: PRACTICE_STATE.IDLE,
      elapsedSeconds: 0,
      playerScore: 0,
      rivalScore: 0,
      lastOutcome: null,
      rivalType: PRACTICE_RIVAL_TYPE.MINISUMO,
    });

    session.start();
    session.advance(1.25);
    expect(session.state.elapsedSeconds).toBe(1.25);

    session.pause();
    session.advance(1);
    expect(session.status).toBe(PRACTICE_STATE.PAUSED);
    expect(session.state.elapsedSeconds).toBe(1.25);

    session.resume();
    session.markOut(ROUND_OUTCOME.PLAYER_SCORES);
    expect(session.status).toBe(PRACTICE_STATE.OUT);
    expect(session.state.playerScore).toBe(1);
    expect(session.state.rivalScore).toBe(0);
    expect(session.state.lastOutcome).toBe(ROUND_OUTCOME.PLAYER_SCORES);

    session.markOut(ROUND_OUTCOME.RIVAL_SCORES);
    expect(session.state.playerScore).toBe(1);
    expect(session.state.rivalScore).toBe(0);

    session.startNextRound();
    expect(session.state).toEqual({
      status: PRACTICE_STATE.RUNNING,
      elapsedSeconds: 0,
      playerScore: 1,
      rivalScore: 0,
      lastOutcome: null,
      rivalType: PRACTICE_RIVAL_TYPE.MINISUMO,
    });

    session.reset();
    expect(session.state).toEqual({
      status: PRACTICE_STATE.RESET,
      elapsedSeconds: 0,
      playerScore: 0,
      rivalScore: 0,
      lastOutcome: null,
      rivalType: PRACTICE_RIVAL_TYPE.MINISUMO,
    });

    session.acknowledgeReset();
    expect(session.status).toBe(PRACTICE_STATE.IDLE);
  });

  it('ignores invalid transitions without mutating the snapshot', () => {
    const current: PracticeSessionSnapshot = {
      status: PRACTICE_STATE.IDLE,
      elapsedSeconds: 3,
      playerScore: 2,
      rivalScore: 1,
      lastOutcome: null,
      rivalType: PRACTICE_RIVAL_TYPE.MINISUMO,
    };

    expect(transitionPracticeState(current, { type: PRACTICE_EVENT.PAUSE })).toEqual(current);
    expect(
      transitionPracticeState(current, {
        type: PRACTICE_EVENT.OUT,
        outcome: ROUND_OUTCOME.PLAYER_SCORES,
      }),
    ).toEqual(current);
  });

  it('awards both sides a point when both robots leave in the same step', () => {
    const session = new PracticeSession();
    session.start();
    session.markOut(ROUND_OUTCOME.BOTH_SCORE);

    expect(session.state.playerScore).toBe(1);
    expect(session.state.rivalScore).toBe(1);
  });

  it('rejects non-deterministic time input', () => {
    const session = new PracticeSession();

    expect(() => session.advance(-1)).toThrow(RangeError);
    expect(() => session.advance(Number.NaN)).toThrow(RangeError);
  });

  it('keeps the selected rival through round changes and full score resets', () => {
    const session = new PracticeSession();
    expect(session.setRivalType(PRACTICE_RIVAL_TYPE.CYLINDER)).toBe(true);
    session.start();
    session.markOut(ROUND_OUTCOME.PLAYER_SCORES);
    session.startNextRound();

    expect(session.state.rivalType).toBe(PRACTICE_RIVAL_TYPE.CYLINDER);
    session.reset();
    expect(session.state.rivalType).toBe(PRACTICE_RIVAL_TYPE.CYLINDER);
    expect(session.state.playerScore).toBe(0);
    session.acknowledgeReset();
    expect(session.state.rivalType).toBe(PRACTICE_RIVAL_TYPE.CYLINDER);
  });

  it('rejects rival changes during a round and allows them during preparation', () => {
    const session = new PracticeSession();
    expect(session.setRivalType(PRACTICE_RIVAL_TYPE.CYLINDER)).toBe(true);
    session.start();
    session.advance(2.5);

    expect(session.setRivalType(PRACTICE_RIVAL_TYPE.MINISUMO)).toBe(false);
    expect(session.state.rivalType).toBe(PRACTICE_RIVAL_TYPE.CYLINDER);
    expect(session.state.elapsedSeconds).toBe(2.5);

    session.pause();
    expect(session.setRivalType(PRACTICE_RIVAL_TYPE.MINISUMO)).toBe(false);
    expect(session.state.rivalType).toBe(PRACTICE_RIVAL_TYPE.CYLINDER);
    session.resume();
    session.markOut(ROUND_OUTCOME.PLAYER_SCORES);
    expect(session.setRivalType(PRACTICE_RIVAL_TYPE.MINISUMO)).toBe(true);

    expect(session.state.status).toBe(PRACTICE_STATE.OUT);
    expect(session.state.rivalType).toBe(PRACTICE_RIVAL_TYPE.MINISUMO);
    expect(session.state.elapsedSeconds).toBe(2.5);
    expect(session.state.playerScore).toBe(1);
  });
});
