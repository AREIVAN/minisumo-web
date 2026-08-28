export const MOVEMENT_ACTION = {
  FORWARD: 'forward',
  REVERSE: 'reverse',
  LEFT: 'left',
  RIGHT: 'right',
} as const;

export type MovementAction = (typeof MOVEMENT_ACTION)[keyof typeof MOVEMENT_ACTION];

export interface KeyBindings {
  readonly forward: string;
  readonly reverse: string;
  readonly left: string;
  readonly right: string;
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: 'KeyW',
  reverse: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
};

export const KEY_BINDINGS_STORAGE_KEY = 'minisumo-arena:key-bindings:v1';

const MOVEMENT_ACTIONS: readonly MovementAction[] = [
  MOVEMENT_ACTION.FORWARD,
  MOVEMENT_ACTION.REVERSE,
  MOVEMENT_ACTION.LEFT,
  MOVEMENT_ACTION.RIGHT,
];

const RESERVED_KEY_CODES = new Set([
  'Backspace',
  'CapsLock',
  'ContextMenu',
  'Delete',
  'End',
  'Enter',
  'Escape',
  'Home',
  'Insert',
  'KeyR',
  'PageDown',
  'PageUp',
  'ScrollLock',
  'Space',
  'Tab',
]);

const MODIFIER_KEY_PREFIXES = ['Alt', 'Control', 'Meta', 'OS', 'Shift'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function isBindableKeyCode(code: string): boolean {
  if (code.length === 0 || code === 'Unidentified' || RESERVED_KEY_CODES.has(code)) {
    return false;
  }

  if (/^F\d{1,2}$/.test(code)) return false;
  return !MODIFIER_KEY_PREFIXES.some((prefix) => code.startsWith(prefix));
}

export function isMovementAction(value: string | undefined): value is MovementAction {
  return value !== undefined && MOVEMENT_ACTIONS.includes(value as MovementAction);
}

export function isValidKeyBindings(value: unknown): value is KeyBindings {
  if (!isRecord(value)) return false;

  const codes = MOVEMENT_ACTIONS.map((action) => value[action]);
  return (
    codes.every((code): code is string => typeof code === 'string' && isBindableKeyCode(code)) &&
    new Set(codes).size === MOVEMENT_ACTIONS.length
  );
}

export function updateKeyBinding(
  bindings: KeyBindings,
  action: MovementAction,
  code: string,
): KeyBindings | undefined {
  if (!isBindableKeyCode(code)) return undefined;

  const alreadyAssigned = MOVEMENT_ACTIONS.some(
    (candidate) => candidate !== action && bindings[candidate] === code,
  );
  if (alreadyAssigned) return undefined;

  return { ...bindings, [action]: code };
}

export function formatKeyCode(code: string): string {
  const labels: Readonly<Record<string, string>> = {
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    Comma: ',',
    Equal: '=',
    Minus: '-',
    Period: '.',
    Slash: '/',
  };
  const explicitLabel = labels[code];
  if (explicitLabel) return explicitLabel;
  if (code.startsWith('Key') && code.length === 4) return code.slice(3).toUpperCase();
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
  if (code.startsWith('Numpad')) return `NP ${code.slice(6)}`;
  return code;
}

export function readKeyBindings(storage: Storage | undefined = getStorage()): KeyBindings {
  if (!storage) return DEFAULT_KEY_BINDINGS;

  try {
    const stored = storage.getItem(KEY_BINDINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_KEY_BINDINGS;
    const parsed: unknown = JSON.parse(stored);
    return isValidKeyBindings(parsed) ? parsed : DEFAULT_KEY_BINDINGS;
  } catch {
    return DEFAULT_KEY_BINDINGS;
  }
}

export function saveKeyBindings(
  bindings: KeyBindings,
  storage: Storage | undefined = getStorage(),
): boolean {
  if (!isValidKeyBindings(bindings) || !storage) return false;

  try {
    storage.setItem(KEY_BINDINGS_STORAGE_KEY, JSON.stringify(bindings));
    return true;
  } catch {
    return false;
  }
}
