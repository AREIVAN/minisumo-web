export const PRACTICE_STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  OUT: 'out',
  RESET: 'reset',
} as const;

export type PracticeState = (typeof PRACTICE_STATE)[keyof typeof PRACTICE_STATE];

export const ROUND_OUTCOME = {
  PLAYER_SCORES: 'player-scores',
  RIVAL_SCORES: 'rival-scores',
  BOTH_SCORE: 'both-score',
} as const;

export type RoundOutcome = (typeof ROUND_OUTCOME)[keyof typeof ROUND_OUTCOME];

export const PRACTICE_RIVAL_TYPE = {
  MINISUMO: 'minisumo',
  CYLINDER: 'cylinder',
} as const;

export type PracticeRivalType =
  (typeof PRACTICE_RIVAL_TYPE)[keyof typeof PRACTICE_RIVAL_TYPE];

export const PRACTICE_EVENT = {
  START: 'start',
  PAUSE: 'pause',
  RESUME: 'resume',
  OUT: 'out',
  NEXT_ROUND: 'next-round',
  RESET: 'reset',
  ACKNOWLEDGE_RESET: 'acknowledge-reset',
  SET_RIVAL_TYPE: 'set-rival-type',
} as const;

export type PracticeEventType = (typeof PRACTICE_EVENT)[keyof typeof PRACTICE_EVENT];

export type PracticeEvent =
  | { readonly type: typeof PRACTICE_EVENT.START }
  | { readonly type: typeof PRACTICE_EVENT.PAUSE }
  | { readonly type: typeof PRACTICE_EVENT.RESUME }
  | { readonly type: typeof PRACTICE_EVENT.OUT; readonly outcome: RoundOutcome }
  | { readonly type: typeof PRACTICE_EVENT.NEXT_ROUND }
  | { readonly type: typeof PRACTICE_EVENT.RESET }
  | { readonly type: typeof PRACTICE_EVENT.ACKNOWLEDGE_RESET }
  | {
      readonly type: typeof PRACTICE_EVENT.SET_RIVAL_TYPE;
      readonly rivalType: PracticeRivalType;
    };

export interface PracticeSessionSnapshot {
  readonly status: PracticeState;
  readonly elapsedSeconds: number;
  readonly playerScore: number;
  readonly rivalScore: number;
  readonly lastOutcome: RoundOutcome | null;
  readonly rivalType: PracticeRivalType;
}

export const INITIAL_PRACTICE_SESSION: PracticeSessionSnapshot = {
  status: PRACTICE_STATE.IDLE,
  elapsedSeconds: 0,
  playerScore: 0,
  rivalScore: 0,
  lastOutcome: null,
  rivalType: PRACTICE_RIVAL_TYPE.MINISUMO,
};

function nextStatus(status: PracticeState, event: PracticeEvent): PracticeState {
  if (event.type === PRACTICE_EVENT.RESET) {
    return PRACTICE_STATE.RESET;
  }

  if (event.type === PRACTICE_EVENT.ACKNOWLEDGE_RESET) {
    return status === PRACTICE_STATE.RESET ? PRACTICE_STATE.IDLE : status;
  }

  if (event.type === PRACTICE_EVENT.START) {
    return status === PRACTICE_STATE.IDLE || status === PRACTICE_STATE.RESET
      ? PRACTICE_STATE.RUNNING
      : status;
  }

  if (event.type === PRACTICE_EVENT.PAUSE) {
    return status === PRACTICE_STATE.RUNNING ? PRACTICE_STATE.PAUSED : status;
  }

  if (event.type === PRACTICE_EVENT.RESUME) {
    return status === PRACTICE_STATE.PAUSED ? PRACTICE_STATE.RUNNING : status;
  }

  if (event.type === PRACTICE_EVENT.NEXT_ROUND) {
    return status === PRACTICE_STATE.OUT ? PRACTICE_STATE.RUNNING : status;
  }

  return event.type === PRACTICE_EVENT.OUT && status === PRACTICE_STATE.RUNNING
    ? PRACTICE_STATE.OUT
    : status;
}

export function transitionPracticeState(
  current: PracticeSessionSnapshot,
  event: PracticeEvent,
): PracticeSessionSnapshot {
  const scored = event.type === PRACTICE_EVENT.OUT && current.status === PRACTICE_STATE.RUNNING;
  const startingNextRound =
    event.type === PRACTICE_EVENT.NEXT_ROUND && current.status === PRACTICE_STATE.OUT;
  const resetting = event.type === PRACTICE_EVENT.RESET;
  const status = nextStatus(current.status, event);
  const elapsedSeconds = resetting || startingNextRound ? 0 : current.elapsedSeconds;
  const playerScore = resetting
    ? 0
    : current.playerScore +
      (scored &&
      (event.outcome === ROUND_OUTCOME.PLAYER_SCORES || event.outcome === ROUND_OUTCOME.BOTH_SCORE)
        ? 1
        : 0);
  const rivalScore = resetting
    ? 0
    : current.rivalScore +
      (scored &&
      (event.outcome === ROUND_OUTCOME.RIVAL_SCORES || event.outcome === ROUND_OUTCOME.BOTH_SCORE)
        ? 1
        : 0);
  const lastOutcome =
    resetting || startingNextRound
      ? null
      : scored && event.type === PRACTICE_EVENT.OUT
        ? event.outcome
        : current.lastOutcome;

  const canChangeRival =
    current.status !== PRACTICE_STATE.RUNNING && current.status !== PRACTICE_STATE.PAUSED;
  const rivalType =
    event.type === PRACTICE_EVENT.SET_RIVAL_TYPE && canChangeRival
      ? event.rivalType
      : current.rivalType;

  return { status, elapsedSeconds, playerScore, rivalScore, lastOutcome, rivalType };
}
