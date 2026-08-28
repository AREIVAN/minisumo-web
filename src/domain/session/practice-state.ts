export const PRACTICE_STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  OUT: 'out',
  RESET: 'reset',
} as const;

export type PracticeState = (typeof PRACTICE_STATE)[keyof typeof PRACTICE_STATE];

export const PRACTICE_EVENT = {
  START: 'start',
  PAUSE: 'pause',
  RESUME: 'resume',
  OUT: 'out',
  RESET: 'reset',
  ACKNOWLEDGE_RESET: 'acknowledge-reset',
} as const;

export type PracticeEventType = (typeof PRACTICE_EVENT)[keyof typeof PRACTICE_EVENT];

export type PracticeEvent =
  | { readonly type: typeof PRACTICE_EVENT.START }
  | { readonly type: typeof PRACTICE_EVENT.PAUSE }
  | { readonly type: typeof PRACTICE_EVENT.RESUME }
  | { readonly type: typeof PRACTICE_EVENT.OUT }
  | { readonly type: typeof PRACTICE_EVENT.RESET }
  | { readonly type: typeof PRACTICE_EVENT.ACKNOWLEDGE_RESET };

export interface PracticeSessionSnapshot {
  readonly status: PracticeState;
  readonly elapsedSeconds: number;
}

export const INITIAL_PRACTICE_SESSION: PracticeSessionSnapshot = {
  status: PRACTICE_STATE.IDLE,
  elapsedSeconds: 0,
};

function nextStatus(status: PracticeState, event: PracticeEventType): PracticeState {
  if (event === PRACTICE_EVENT.RESET) {
    return PRACTICE_STATE.RESET;
  }

  if (event === PRACTICE_EVENT.ACKNOWLEDGE_RESET) {
    return status === PRACTICE_STATE.RESET ? PRACTICE_STATE.IDLE : status;
  }

  if (event === PRACTICE_EVENT.START) {
    return status === PRACTICE_STATE.IDLE || status === PRACTICE_STATE.RESET
      ? PRACTICE_STATE.RUNNING
      : status;
  }

  if (event === PRACTICE_EVENT.PAUSE) {
    return status === PRACTICE_STATE.RUNNING ? PRACTICE_STATE.PAUSED : status;
  }

  if (event === PRACTICE_EVENT.RESUME) {
    return status === PRACTICE_STATE.PAUSED ? PRACTICE_STATE.RUNNING : status;
  }

  return event === PRACTICE_EVENT.OUT && status === PRACTICE_STATE.RUNNING
    ? PRACTICE_STATE.OUT
    : status;
}

export function transitionPracticeState(
  current: PracticeSessionSnapshot,
  event: PracticeEvent,
): PracticeSessionSnapshot {
  const status = nextStatus(current.status, event.type);
  const elapsedSeconds = event.type === PRACTICE_EVENT.RESET ? 0 : current.elapsedSeconds;

  return { status, elapsedSeconds };
}
