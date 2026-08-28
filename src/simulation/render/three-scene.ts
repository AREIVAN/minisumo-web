import * as THREE from 'three';
import type { DohyoSpec, RobotSpec } from '../../domain/index';
import type { PhysicsSnapshot } from '../physics/rapier-world';
import { createDohyoMesh } from './dohyo-mesh';
import { createRobotMesh } from './robot-mesh';

export const CAMERA_MODE = {
  ISOMETRIC: 'isometric',
  TOP: 'top',
} as const;

export type CameraMode = (typeof CAMERA_MODE)[keyof typeof CAMERA_MODE];

function isWebGLAvailable(canvas: HTMLCanvasElement): boolean {
  try {
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export class ThreeScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly robot: THREE.Group;
  private cameraMode: CameraMode = CAMERA_MODE.ISOMETRIC;
  private disposed = false;

  public constructor(canvas: HTMLCanvasElement, dohyo: DohyoSpec, robotSpec: RobotSpec) {
    if (!isWebGLAvailable(canvas)) {
      throw new Error(
        'WebGL no está disponible en este navegador. Probá activar la aceleración gráfica o usar otro navegador.',
      );
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080c14);
    this.scene.fog = new THREE.Fog(0x080c14, 1.2, 3.6);

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.01, 10);
    this.scene.add(this.camera);
    this.setCamera(CAMERA_MODE.ISOMETRIC);

    this.addLights();
    this.scene.add(createDohyoMesh(dohyo));
    this.robot = createRobotMesh(robotSpec);
    this.scene.add(this.robot);
    this.resize();
    window.addEventListener('resize', this.resizeBound);
  }

  private readonly resizeBound = (): void => {
    this.resize();
  };

  public render(snapshot: PhysicsSnapshot): void {
    this.assertNotDisposed();
    this.robot.position.set(snapshot.pose.x, snapshot.verticalPosition, snapshot.pose.y);
    this.robot.rotation.set(0, snapshot.pose.yaw, 0);
    this.renderer.render(this.scene, this.camera);
  }

  public setCamera(mode: CameraMode): void {
    this.cameraMode = mode;
    if (mode === CAMERA_MODE.TOP) {
      this.camera.position.set(0, 0.9, 0.001);
      this.camera.up.set(0, 0, -1);
    } else {
      this.camera.position.set(0.72, 0.68, 0.72);
      this.camera.up.set(0, 1, 0);
    }
    this.camera.lookAt(0, 0, 0);
  }

  public get currentCamera(): CameraMode {
    return this.cameraMode;
  }

  public resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    if (!this.disposed) {
      window.removeEventListener('resize', this.resizeBound);
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      this.renderer.dispose();
      this.disposed = true;
    }
  }

  private addLights(): void {
    const hemisphere = new THREE.HemisphereLight(0xaab9df, 0x101622, 2.1);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xfff1d6, 3.4);
    key.position.set(0.45, 0.9, 0.3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 2.5;
    key.shadow.camera.left = -0.7;
    key.shadow.camera.right = 0.7;
    key.shadow.camera.top = 0.7;
    key.shadow.camera.bottom = -0.7;
    this.scene.add(key);

    const rim = new THREE.PointLight(0x38d9af, 3.2, 1.8, 2);
    rim.position.set(-0.55, 0.4, -0.7);
    this.scene.add(rim);
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error('The Three.js scene has already been disposed.');
    }
  }
}
