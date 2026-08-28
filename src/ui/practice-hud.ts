import { PRACTICE_STATE, type PracticeState } from '../domain/index';
import { CAMERA_MODE, type CameraMode } from '../simulation/render/three-scene';
import {
  DEFAULT_KEY_BINDINGS,
  formatKeyCode,
  isMovementAction,
  updateKeyBinding,
  type KeyBindings,
  type MovementAction,
} from '../simulation/input/key-bindings';

export interface PracticeHudSnapshot {
  readonly status: PracticeState;
  readonly elapsedSeconds: number;
  readonly speed: number;
  readonly camera: CameraMode;
}

export interface PracticeHudActions {
  readonly onStart: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onReset: () => void;
  readonly onExit: () => void;
  readonly onCameraChange: (mode: CameraMode) => void;
  readonly onControlsToggle: () => void;
  readonly onKeyBindingsChange: (bindings: KeyBindings) => void;
  readonly onResetKeyBindings: () => void;
}

type HudAction =
  | 'start'
  | 'pause'
  | 'resume'
  | 'reset'
  | 'exit'
  | 'toggle-controls'
  | 'toggle-remap'
  | 'reset-key-bindings';

function actionFromElement(element: HTMLElement | null): MovementAction | undefined {
  const action = element?.dataset.remapAction;
  return isMovementAction(action) ? action : undefined;
}

function statusLabel(status: PracticeState): string {
  switch (status) {
    case PRACTICE_STATE.RUNNING:
      return 'EN PRÁCTICA';
    case PRACTICE_STATE.PAUSED:
      return 'EN PAUSA';
    case PRACTICE_STATE.OUT:
      return 'FUERA DEL DOHYO';
    case PRACTICE_STATE.RESET:
      return 'REINICIANDO';
    default:
      return 'LISTO';
  }
}

function formatTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatSpeed(speed: number): string {
  return `${Math.round(Math.max(0, speed) * 100)} cm/s`;
}

export class PracticeHud {
  private keyBindings: KeyBindings;
  private capturingAction: MovementAction | undefined;
  private remapFeedback = '';
  private remapOpen = false;

  private readonly onClickBound = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionElement = target.closest<HTMLElement>('[data-action]');
    const action = actionElement?.dataset.action as HudAction | undefined;
    if (action) {
      this.handleAction(action);
      return;
    }

    const remapAction = actionFromElement(target.closest<HTMLElement>('[data-remap-action]'));
    if (remapAction) {
      this.startKeyCapture(remapAction);
      return;
    }

    const cameraElement = target.closest<HTMLElement>('[data-camera]');
    const camera = cameraElement?.dataset.camera as CameraMode | undefined;
    if (camera === CAMERA_MODE.ISOMETRIC || camera === CAMERA_MODE.TOP) {
      this.actions.onCameraChange(camera);
    }
  };

  private readonly onKeyDownBound = (event: KeyboardEvent): void => {
    if (!this.capturingAction) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.code === 'Escape' || event.key === 'Escape') {
      this.capturingAction = undefined;
      this.remapFeedback = 'Asignación cancelada.';
      this.updateRemapUi();
      return;
    }

    const code = event.code;
    if (!code) {
      this.remapFeedback = 'No se pudo leer esa tecla. Probá otra.';
      this.updateRemapUi();
      return;
    }

    const nextBindings = updateKeyBinding(this.keyBindings, this.capturingAction, code);
    if (!nextBindings) {
      this.remapFeedback = 'Esa tecla está reservada o ya está asignada.';
      this.updateRemapUi();
      return;
    }

    this.keyBindings = nextBindings;
    this.capturingAction = undefined;
    this.remapFeedback = `${formatKeyCode(code)} asignada correctamente.`;
    this.actions.onKeyBindingsChange(nextBindings);
    this.updateRemapUi();
  };

  public constructor(
    private readonly shell: HTMLElement,
    private readonly actions: PracticeHudActions,
    keyBindings: KeyBindings = DEFAULT_KEY_BINDINGS,
  ) {
    this.keyBindings = keyBindings;
    shell.addEventListener('click', this.onClickBound);
    window.addEventListener('keydown', this.onKeyDownBound);
  }

  public renderLoading(): void {
    this.shell.innerHTML = `
      <section class="status-screen" aria-live="polite">
        <div class="status-mark" aria-hidden="true">MS</div>
        <p class="eyebrow">MINI SUMO // BOOT</p>
        <h1>Preparando la arena</h1>
        <p class="muted">Inicializando física y render 3D…</p>
      </section>
    `;
  }

  public renderError(message: string): void {
    this.shell.innerHTML = `
      <section class="status-screen error-screen" role="alert" aria-labelledby="error-title">
        <div class="status-mark status-mark-error" aria-hidden="true">!</div>
        <p class="eyebrow">MINI SUMO // ERROR</p>
        <h1 id="error-title">No se pudo abrir la práctica</h1>
        <p id="error-message" class="muted"></p>
        <p class="error-help">Recargá la página después de verificar la aceleración gráfica del navegador.</p>
      </section>
    `;
    const errorMessage = this.shell.querySelector<HTMLElement>('#error-message');
    if (errorMessage) errorMessage.textContent = message;
  }

  public renderLanding(): void {
    this.shell.innerHTML = `
      <div class="landing-layout">
        <header class="brand-lockup">
          <span class="brand-symbol" aria-hidden="true">+</span>
          <span>MINI SUMO <strong>ARENA</strong></span>
        </header>
        <section class="landing-card" aria-labelledby="landing-title">
          <p class="eyebrow">PRÁCTICA MANUAL // 001</p>
          <h1 id="landing-title">Entrená el borde.</h1>
          <p class="landing-copy">
            Controlá un único robot de 10 cm dentro de un dohyo reglamentario. La tawara no es una pared:
            encontrá el límite con precisión.
          </p>
          <button class="primary-button" type="button" data-action="start">
            <span>Iniciar práctica</span><span aria-hidden="true">↗</span>
          </button>
          <dl class="spec-list">
            <div><dt>DOHYO</dt><dd>Ø 77 cm</dd></div>
            <div><dt>ROBOT</dt><dd>10 × 10 cm</dd></div>
            <div><dt>MASA</dt><dd>500 g</dd></div>
          </dl>
        </section>
        <footer class="landing-footer">
          <span>SIMULACIÓN EN UNIDADES SI</span>
          <span>TECLAS CONFIGURABLES</span>
        </footer>
      </div>
    `;
  }

  public renderPractice(snapshot: PracticeHudSnapshot): void {
    this.shell.innerHTML = `
      <div class="practice-layout">
        <header class="practice-header">
          <div class="brand-lockup compact"><span class="brand-symbol" aria-hidden="true">+</span><span>MINI SUMO <strong>ARENA</strong></span></div>
          <div class="practice-header-meta"><span class="session-label">PRÁCTICA MANUAL</span><span id="status-pill" class="status-pill" data-status="${snapshot.status}">${statusLabel(snapshot.status)}</span></div>
        </header>

        <section class="telemetry-panel panel" aria-label="Telemetría de la práctica">
          <p class="panel-kicker">TELEMETRÍA / LIVE</p>
          <div class="telemetry-grid">
            <div><span class="metric-label">VELOCIDAD APROX.</span><strong id="speed-value">${formatSpeed(snapshot.speed)}</strong></div>
            <div><span class="metric-label">TIEMPO</span><strong id="time-value">${formatTime(snapshot.elapsedSeconds)}</strong></div>
          </div>
          <div class="telemetry-line"><span>ÁREA VÁLIDA</span><strong>Ø 0.77 m</strong></div>
          <div class="telemetry-line"><span>SUPERFICIE NEGRA</span><strong>Ø 0.36 m</strong></div>
        </section>

        <aside id="controls-panel" class="controls-panel panel" aria-label="Controles de conducción">
          <div class="panel-heading"><p class="panel-kicker">CONTROL</p><button class="icon-button" type="button" data-action="toggle-controls" aria-label="Ocultar controles">×</button></div>
          <div class="control-layout">
            <div class="key-cluster" aria-label="Teclas de conducción">
              <kbd data-binding-key="forward">${formatKeyCode(this.keyBindings.forward)}</kbd>
              <div><kbd data-binding-key="left">${formatKeyCode(this.keyBindings.left)}</kbd><kbd data-binding-key="reverse">${formatKeyCode(this.keyBindings.reverse)}</kbd><kbd data-binding-key="right">${formatKeyCode(this.keyBindings.right)}</kbd></div>
            </div>
            <p class="control-copy">Acelerar, revertir<br />y girar</p>
          </div>
          <button class="remap-open-button" type="button" data-action="toggle-remap" aria-expanded="false">Remapear teclas</button>
          <div class="control-hints"><span><kbd>R</kbd> Reiniciar</span><span><kbd>ESC</kbd> Pausa / panel</span></div>
        </aside>

        <aside id="remap-panel" class="remap-panel panel" aria-label="Remapear teclas de movimiento" hidden>
          <div class="panel-heading"><p class="panel-kicker">REMAPEO / INPUT</p><button class="icon-button" type="button" data-action="toggle-remap" aria-label="Cerrar remapeo">×</button></div>
          <p class="remap-instructions">Elegí una acción y presioná la tecla que quieras usar. <strong>Esc</strong> cancela.</p>
          <div class="binding-list">
            <div class="binding-row"><span>Avanzar</span><kbd data-binding-key="forward">${formatKeyCode(this.keyBindings.forward)}</kbd><button type="button" class="binding-button" data-remap-action="forward">Asignar</button></div>
            <div class="binding-row"><span>Retroceder</span><kbd data-binding-key="reverse">${formatKeyCode(this.keyBindings.reverse)}</kbd><button type="button" class="binding-button" data-remap-action="reverse">Asignar</button></div>
            <div class="binding-row"><span>Girar izquierda</span><kbd data-binding-key="left">${formatKeyCode(this.keyBindings.left)}</kbd><button type="button" class="binding-button" data-remap-action="left">Asignar</button></div>
            <div class="binding-row"><span>Girar derecha</span><kbd data-binding-key="right">${formatKeyCode(this.keyBindings.right)}</kbd><button type="button" class="binding-button" data-remap-action="right">Asignar</button></div>
          </div>
          <p id="remap-feedback" class="remap-feedback" aria-live="polite">${this.remapFeedback}</p>
          <button class="reset-bindings-button" type="button" data-action="reset-key-bindings">Restablecer WASD</button>
        </aside>

        <div class="out-message" id="out-message" role="status" aria-live="assertive" hidden>
          <span class="out-dot" aria-hidden="true"></span><div><strong>ROBOT FUERA DEL DOHYO</strong><span>Reiniciá para volver a practicar.</span></div>
        </div>

        <div class="camera-switcher" role="group" aria-label="Vista de cámara">
          <button type="button" data-camera="isometric" class="camera-button" aria-pressed="${snapshot.camera === CAMERA_MODE.ISOMETRIC}">ISO</button>
          <button type="button" data-camera="top" class="camera-button" aria-pressed="${snapshot.camera === CAMERA_MODE.TOP}">TOP</button>
        </div>

        <nav class="action-bar" aria-label="Acciones de práctica">
          <button id="pause-button" class="secondary-button" type="button" data-action="pause">Pausar <span class="button-key">Esc</span></button>
          <button id="resume-button" class="secondary-button" type="button" data-action="resume" hidden>Reanudar</button>
          <button class="secondary-button" type="button" data-action="reset">Reiniciar <span class="button-key">R</span></button>
          <button class="text-button" type="button" data-action="exit">Salir</button>
        </nav>

        <button id="controls-toggle" class="controls-toggle" type="button" data-action="toggle-controls" aria-expanded="true">Controles</button>
      </div>
    `;
    this.setControlsOpen(true);
    this.setRemapOpen(false);
    this.update(snapshot);
  }

  public update(snapshot: PracticeHudSnapshot): void {
    const speed = this.shell.querySelector<HTMLElement>('#speed-value');
    const time = this.shell.querySelector<HTMLElement>('#time-value');
    const status = this.shell.querySelector<HTMLElement>('#status-pill');
    const outMessage = this.shell.querySelector<HTMLElement>('#out-message');
    const pause = this.shell.querySelector<HTMLButtonElement>('#pause-button');
    const resume = this.shell.querySelector<HTMLButtonElement>('#resume-button');
    if (!speed || !time || !status || !outMessage || !pause || !resume) return;

    speed.textContent = formatSpeed(snapshot.speed);
    time.textContent = formatTime(snapshot.elapsedSeconds);
    status.textContent = statusLabel(snapshot.status);
    status.dataset.status = snapshot.status;
    const isOut = snapshot.status === PRACTICE_STATE.OUT;
    outMessage.hidden = !isOut;
    pause.hidden = snapshot.status !== PRACTICE_STATE.RUNNING;
    resume.hidden = snapshot.status !== PRACTICE_STATE.PAUSED;

    this.shell.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.camera === snapshot.camera));
    });
  }

  public setControlsOpen(open: boolean): void {
    const panel = this.shell.querySelector<HTMLElement>('#controls-panel');
    const toggle = this.shell.querySelector<HTMLButtonElement>('#controls-toggle');
    if (!panel || !toggle) return;
    panel.classList.toggle('is-hidden', !open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Controles' : 'Abrir controles';
  }

  public setKeyBindings(bindings: KeyBindings): void {
    this.keyBindings = bindings;
    this.capturingAction = undefined;
    this.updateRemapUi();
  }

  public setRemapOpen(open: boolean): void {
    this.remapOpen = open;
    if (!open) this.capturingAction = undefined;
    const panel = this.shell.querySelector<HTMLElement>('#remap-panel');
    if (panel) panel.hidden = !open;
    this.shell
      .querySelectorAll<HTMLButtonElement>('[data-action="toggle-remap"]')
      .forEach((button) => {
        button.setAttribute('aria-expanded', String(open));
      });
    this.updateRemapUi();
  }

  public dispose(): void {
    this.shell.removeEventListener('click', this.onClickBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
  }

  private handleAction(action: HudAction): void {
    switch (action) {
      case 'start':
        this.actions.onStart();
        break;
      case 'pause':
        this.actions.onPause();
        break;
      case 'resume':
        this.actions.onResume();
        break;
      case 'reset':
        this.actions.onReset();
        break;
      case 'exit':
        this.actions.onExit();
        break;
      case 'toggle-controls':
        this.actions.onControlsToggle();
        break;
      case 'toggle-remap':
        this.setRemapOpen(!this.remapOpen);
        break;
      case 'reset-key-bindings':
        this.actions.onResetKeyBindings();
        break;
    }
  }

  private startKeyCapture(action: MovementAction): void {
    this.capturingAction = action;
    this.remapFeedback = 'Presioná una tecla…';
    this.updateRemapUi();
  }

  private updateRemapUi(): void {
    const panel = this.shell.querySelector<HTMLElement>('#remap-panel');
    if (!panel) return;

    (Object.keys(this.keyBindings) as MovementAction[]).forEach((action) => {
      this.shell.querySelectorAll<HTMLElement>(`[data-binding-key="${action}"]`).forEach((key) => {
        key.textContent = formatKeyCode(this.keyBindings[action]);
      });
      const button = panel.querySelector<HTMLButtonElement>(`[data-remap-action="${action}"]`);
      if (button) {
        button.textContent = this.capturingAction === action ? 'Presioná una tecla' : 'Asignar';
        button.setAttribute('aria-pressed', String(this.capturingAction === action));
      }
    });

    const feedback = panel.querySelector<HTMLElement>('#remap-feedback');
    if (feedback) feedback.textContent = this.remapFeedback;
  }
}
