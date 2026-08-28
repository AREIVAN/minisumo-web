import {
  BASE_DOHYO_SPEC,
  PRACTICE_ROBOT_SPEC,
  PRACTICE_STATE,
  PracticeSession,
  type DriveCommand,
} from '../domain/index';
import { consumeFixedSteps, FIXED_TIME_STEP, type FixedStepState } from '../simulation/fixed-step';
import type { InputSource } from '../simulation/input/input-source';
import {
  DEFAULT_KEY_BINDINGS,
  saveKeyBindings,
  type KeyBindings,
} from '../simulation/input/key-bindings';
import { RapierWorld } from '../simulation/physics/rapier-world';
import { CAMERA_MODE, type CameraMode, ThreeScene } from '../simulation/render/three-scene';
import { PracticeHud, type PracticeHudSnapshot } from '../ui/practice-hud';

export interface PracticeApplicationOptions {
  readonly hud: PracticeHud;
  readonly simulation: RapierWorld;
  readonly scene: ThreeScene;
  readonly input: InputSource;
}

export class PracticeApplication {
  private readonly session = new PracticeSession();
  private readonly hud: PracticeHud;
  private readonly simulation: RapierWorld;
  private readonly scene: ThreeScene;
  private readonly input: InputSource;
  private fixedStepState: FixedStepState = { accumulator: 0 };
  private lastFrameTime: number | undefined;
  private animationFrame: number | undefined;
  private isLooping = false;
  private controlsOpen = true;

  private readonly onKeyDownBound = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (this.session.status === PRACTICE_STATE.RUNNING) {
      this.pause();
      this.controlsOpen = true;
      this.hud.setControlsOpen(true);
    } else {
      this.toggleControls();
    }
  };

  private readonly frameBound = (timestamp: number): void => {
    if (!this.isLooping) return;
    this.update(timestamp);
    this.animationFrame = window.requestAnimationFrame(this.frameBound);
  };

  public constructor(options: PracticeApplicationOptions) {
    this.hud = options.hud;
    this.simulation = options.simulation;
    this.scene = options.scene;
    this.input = options.input;
    window.addEventListener('keydown', this.onKeyDownBound);
  }

  public mount(): void {
    this.hud.renderLanding();
    this.renderCurrentSnapshot();
  }

  public start(): void {
    if (this.session.status === PRACTICE_STATE.OUT) {
      this.reset();
      return;
    }
    this.session.start();
    this.controlsOpen = true;
    this.hud.renderPractice(this.hudSnapshot());
    this.hud.setControlsOpen(true);
    this.startLoop();
  }

  public pause(): void {
    this.session.pause();
    this.hud.update(this.hudSnapshot());
  }

  public resume(): void {
    this.session.resume();
    this.hud.update(this.hudSnapshot());
  }

  public reset(): void {
    this.session.reset();
    this.session.acknowledgeReset();
    this.simulation.reset();
    this.fixedStepState = { accumulator: 0 };
    this.lastFrameTime = undefined;
    this.session.start();
    this.controlsOpen = true;
    this.hud.update(this.hudSnapshot());
    this.hud.setControlsOpen(true);
    this.startLoop();
  }

  public exit(): void {
    this.stopLoop();
    this.session.reset();
    this.session.acknowledgeReset();
    this.simulation.reset();
    this.hud.renderLanding();
    this.renderCurrentSnapshot();
  }

  public setCamera(mode: CameraMode): void {
    this.scene.setCamera(mode);
    this.hud.update(this.hudSnapshot());
    this.renderCurrentSnapshot();
  }

  public toggleControls(): void {
    this.controlsOpen = !this.controlsOpen;
    this.hud.setControlsOpen(this.controlsOpen);
  }

  public setKeyBindings(bindings: KeyBindings): void {
    this.input.setKeyBindings?.(bindings);
    saveKeyBindings(bindings);
    this.hud.setKeyBindings(bindings);
  }

  public resetKeyBindings(): void {
    this.setKeyBindings(DEFAULT_KEY_BINDINGS);
  }

  public dispose(): void {
    this.stopLoop();
    window.removeEventListener('keydown', this.onKeyDownBound);
    this.input.dispose();
    this.scene.dispose();
    this.simulation.dispose();
    this.hud.dispose();
  }

  private startLoop(): void {
    if (this.isLooping) return;
    this.isLooping = true;
    this.lastFrameTime = undefined;
    this.animationFrame = window.requestAnimationFrame(this.frameBound);
  }

  private stopLoop(): void {
    this.isLooping = false;
    if (this.animationFrame !== undefined) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    this.lastFrameTime = undefined;
  }

  private update(timestamp: number): void {
    const elapsed =
      this.lastFrameTime === undefined
        ? 0
        : Math.min(Math.max((timestamp - this.lastFrameTime) / 1000, 0), 0.1);
    this.lastFrameTime = timestamp;

    const command = this.input.readCommand();
    if (command.reset) {
      this.reset();
      return;
    }

    if (this.session.status === PRACTICE_STATE.RUNNING) {
      const advance = consumeFixedSteps(this.fixedStepState, elapsed);
      this.fixedStepState = advance.state;
      this.stepPhysics(advance.steps, command);
    }

    this.renderCurrentSnapshot();
  }

  private stepPhysics(steps: number, command: DriveCommand): void {
    for (let step = 0; step < steps; step += 1) {
      this.simulation.step(command);
      this.session.advance(FIXED_TIME_STEP);
      if (this.simulation.isBoundaryOut()) {
        this.session.markOut();
        this.simulation.halt();
        break;
      }
    }
  }

  private renderCurrentSnapshot(): void {
    this.scene.render(this.simulation.snapshot);
    this.hud.update(this.hudSnapshot());
  }

  private hudSnapshot(): PracticeHudSnapshot {
    const snapshot = this.simulation.snapshot;
    return {
      status: this.session.status,
      elapsedSeconds: this.session.state.elapsedSeconds,
      speed: snapshot.speed,
      camera: this.scene.currentCamera ?? CAMERA_MODE.ISOMETRIC,
    };
  }
}

export { BASE_DOHYO_SPEC, PRACTICE_ROBOT_SPEC };
