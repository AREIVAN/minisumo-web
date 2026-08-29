import './styles.css';
import { PracticeApplication } from './app/practice-session';
import {
  BASE_DOHYO_SPEC,
  PRACTICE_PUSHABLE_OBJECT_SPEC,
  PRACTICE_ROBOT_SPEC,
} from './domain/index';
import { KeyboardInput } from './simulation/input/keyboard-input';
import { readKeyBindings, type KeyBindings } from './simulation/input/key-bindings';
import { RapierWorld } from './simulation/physics/rapier-world';
import { CAMERA_MODE, ThreeScene } from './simulation/render/three-scene';
import { PracticeHud } from './ui/practice-hud';

const appShell = document.querySelector<HTMLElement>('#app-shell');
const canvas = document.querySelector<HTMLCanvasElement>('#simulator-canvas');

if (!appShell || !canvas) {
  throw new Error('No se encontró el contenedor principal o el canvas del simulador.');
}

const simulatorCanvas = canvas;

let application: PracticeApplication | undefined;
const initialKeyBindings: KeyBindings = readKeyBindings();
const hud = new PracticeHud(
  appShell,
  {
    onStart: () => application?.start(),
    onPause: () => application?.pause(),
    onResume: () => application?.resume(),
    onReset: () => application?.reset(),
    onExit: () => application?.exit(),
    onCameraChange: (mode) => application?.setCamera(mode),
    onControlsToggle: () => application?.toggleControls(),
    onKeyBindingsChange: (bindings) => application?.setKeyBindings(bindings),
    onResetKeyBindings: () => application?.resetKeyBindings(),
  },
  initialKeyBindings,
);

hud.renderLoading();

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Ocurrió un error inesperado al inicializar la simulación.';
}

async function bootstrap(): Promise<void> {
  let simulation: RapierWorld | undefined;
  let scene: ThreeScene | undefined;
  let input: KeyboardInput | undefined;

  try {
    simulation = await RapierWorld.create(
      BASE_DOHYO_SPEC,
      PRACTICE_ROBOT_SPEC,
      undefined,
      PRACTICE_PUSHABLE_OBJECT_SPEC,
    );
    scene = new ThreeScene(
      simulatorCanvas,
      BASE_DOHYO_SPEC,
      PRACTICE_ROBOT_SPEC,
      PRACTICE_PUSHABLE_OBJECT_SPEC,
    );
    scene.setCamera(CAMERA_MODE.ISOMETRIC);
    input = new KeyboardInput(window, initialKeyBindings);
    application = new PracticeApplication({ hud, simulation, scene, input });
    application.mount();
  } catch (error) {
    input?.dispose();
    scene?.dispose();
    simulation?.dispose();
    hud.renderError(errorMessage(error));
  }
}

void bootstrap();
