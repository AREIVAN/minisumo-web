import * as THREE from 'three';
import type { RobotSpec } from '../../domain/index';
import {
  createRobotWedgeVertices,
  FRONT_BLADE_ANGLE,
  FRONT_BLADE_CENTER_Z_RATIO,
} from '../robot-geometry';

const WHEEL_RADIUS = 0.016;
const WHEEL_WIDTH = 0.012;

export interface RobotMeshOptions {
  readonly name?: string;
  readonly accentColor?: THREE.ColorRepresentation;
}

function createWedgeGeometry(spec: RobotSpec): THREE.BufferGeometry {
  const indices = [
    0,
    3,
    2,
    0,
    2,
    1, // underside
    0,
    4,
    5,
    0,
    5,
    1, // front blade face
    1,
    5,
    6,
    1,
    6,
    2, // right side
    2,
    6,
    7,
    2,
    7,
    3, // rear
    3,
    7,
    4,
    3,
    4,
    0, // left side
    4,
    7,
    6,
    4,
    6,
    5, // sloped top
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(createRobotWedgeVertices(spec), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createWheel(material: THREE.Material, x: number): THREE.Mesh {
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 12),
    material,
  );
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, -0.009, 0);
  wheel.castShadow = true;
  return wheel;
}

export function createRobotMesh(spec: RobotSpec, options: RobotMeshOptions = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = options.name ?? 'practice-robot';
  const accentColor = options.accentColor ?? 0xc52b2b;

  const chassisMaterial = new THREE.MeshStandardMaterial({
    color: 0x090b0e,
    roughness: 0.68,
    metalness: 0.42,
  });
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x171a1f,
    roughness: 0.5,
    metalness: 0.58,
    side: THREE.DoubleSide,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.38,
    metalness: 0.56,
  });
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.55,
    metalness: 0.32,
  });
  const hubMaterial = new THREE.MeshStandardMaterial({
    color: 0xd6d9dc,
    roughness: 0.3,
    metalness: 0.78,
  });
  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8d2dc,
    roughness: 0.32,
    metalness: 0.82,
  });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x020304,
    roughness: 0.42,
    metalness: 0.2,
  });

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.92, 0.012, spec.depth * 0.86),
    chassisMaterial,
  );
  chassis.position.y = -spec.height * 0.38;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  chassis.name = 'undercarriage';
  group.add(chassis);

  const shell = new THREE.Mesh(createWedgeGeometry(spec), shellMaterial);
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.name = 'wedge-shell';
  group.add(shell);

  const upperDeck = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.68, 0.006, spec.depth * 0.42),
    chassisMaterial,
  );
  upperDeck.position.set(0, spec.height * 0.43, spec.depth * 0.08);
  upperDeck.castShadow = true;
  upperDeck.name = 'electronics-cover';
  group.add(upperDeck);

  const sensorCap = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.005, 0.014), trimMaterial);
  sensorCap.position.set(-spec.width * 0.2, spec.height * 0.53, spec.depth * 0.08);
  sensorCap.castShadow = true;
  sensorCap.name = 'rear-red-accent';
  group.add(sensorCap);

  const sensorBar = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.002, 0.006), windowMaterial);
  sensorBar.position.set(spec.width * 0.16, spec.height * 0.53, spec.depth * 0.08);
  sensorBar.name = 'top-switch';
  group.add(sensorBar);

  for (const x of [-0.027, 0.027]) {
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.007, 0.035), trimMaterial);
    topRail.position.set(x, spec.height * 0.43, spec.depth * 0.1);
    topRail.castShadow = true;
    topRail.name = 'top-red-rail';
    group.add(topRail);
  }

  const topScrewPositions = [
    [-0.027, 0.002],
    [0.027, 0.002],
    [-0.027, 0.034],
    [0.027, 0.034],
  ] as const;
  for (const [x, z] of topScrewPositions) {
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0025, 0.0025, 0.0015, 8),
      hubMaterial,
    );
    screw.position.set(x, spec.height * 0.51, z);
    screw.name = 'top-screw';
    group.add(screw);
  }

  const frontBlade = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.9, 0.004, spec.depth * 0.32),
    bladeMaterial,
  );
  // One continuous inclined plate: the ramp is the blade, not a bar mounted
  // on top of it. The rear edge tucks into the black front shell.
  frontBlade.position.set(0, -spec.height * 0.27, spec.depth * FRONT_BLADE_CENTER_Z_RATIO);
  frontBlade.rotation.x = FRONT_BLADE_ANGLE;
  frontBlade.castShadow = true;
  frontBlade.name = 'front-ramp';
  group.add(frontBlade);

  for (const x of [-0.023, 0.023]) {
    const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.012, 0.003), windowMaterial);
    // The sensor windows belong to the black shell, above the blade. Keeping
    // them behind the ramp prevents them from reading as bars on the blade.
    frontWindow.position.set(x, -spec.height * 0.04, -spec.depth * 0.34);
    frontWindow.rotation.x = -0.55;
    frontWindow.name = 'front-sensor-window';
    group.add(frontWindow);
  }

  // Keep the tires and hubs within the declared width (including their
  // thickness), while leaving a small edge visible outside the wedge shell.
  const wheelX = spec.width * 0.41;
  for (const x of [-wheelX, wheelX]) {
    group.add(createWheel(wheelMaterial, x));
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, WHEEL_WIDTH + 0.001, 10),
      hubMaterial,
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x, -0.009, 0);
    hub.castShadow = true;
    hub.name = 'wheel-hub';
    group.add(hub);
  }

  return group;
}
