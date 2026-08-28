import * as THREE from 'three';
import type { RobotSpec } from '../../domain/index';

const WHEEL_RADIUS = 0.016;
const WHEEL_WIDTH = 0.012;

function createWedgeGeometry(spec: RobotSpec): THREE.BufferGeometry {
  const width = spec.width * 0.94;
  const depth = spec.depth * 0.92;
  const bottom = -spec.height * 0.43;
  const frontTop = -spec.height * 0.08;
  const rearTop = spec.height * 0.38;
  const frontZ = -depth / 2 + 0.006;
  const rearZ = depth / 2 - 0.004;
  const halfWidth = width / 2;

  const vertices = new Float32Array([
    -halfWidth,
    bottom,
    -depth / 2,
    halfWidth,
    bottom,
    -depth / 2,
    halfWidth,
    bottom,
    depth / 2,
    -halfWidth,
    bottom,
    depth / 2,
    -halfWidth,
    frontTop,
    frontZ,
    halfWidth,
    frontTop,
    frontZ,
    halfWidth,
    rearTop,
    rearZ,
    -halfWidth,
    rearTop,
    rearZ,
  ]);

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
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
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

export function createRobotMesh(spec: RobotSpec): THREE.Group {
  const group = new THREE.Group();
  group.name = 'practice-robot';

  const chassisMaterial = new THREE.MeshStandardMaterial({
    color: 0x101722,
    roughness: 0.72,
    metalness: 0.38,
  });
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0xd94c38,
    roughness: 0.4,
    metalness: 0.62,
    side: THREE.DoubleSide,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2a93b,
    roughness: 0.34,
    metalness: 0.62,
  });
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b0d12,
    roughness: 0.88,
    metalness: 0.08,
  });
  const hubMaterial = new THREE.MeshStandardMaterial({
    color: 0x77e5c0,
    roughness: 0.3,
    metalness: 0.65,
  });
  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8d2dc,
    roughness: 0.32,
    metalness: 0.82,
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
    new THREE.CylinderGeometry(spec.width * 0.31, spec.width * 0.36, 0.006, 8),
    trimMaterial,
  );
  upperDeck.rotation.y = Math.PI / 8;
  upperDeck.position.y = spec.height * 0.43;
  upperDeck.castShadow = true;
  upperDeck.name = 'top-deck';
  group.add(upperDeck);

  const sensorCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.014, 0.006, 8),
    chassisMaterial,
  );
  sensorCap.rotation.y = Math.PI / 8;
  sensorCap.position.set(0, spec.height * 0.53, 0.006);
  sensorCap.castShadow = true;
  sensorCap.name = 'sensor-cap';
  group.add(sensorCap);

  const sensorBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.003, 0.004),
    new THREE.MeshStandardMaterial({ color: 0x77e5c0, roughness: 0.3, metalness: 0.72 }),
  );
  sensorBar.position.set(0, spec.height * 0.54, -0.012);
  sensorBar.name = 'front-sensor';
  group.add(sensorBar);

  const frontBlade = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.82, 0.005, 0.018),
    bladeMaterial,
  );
  frontBlade.position.set(0, -spec.height * 0.36, -spec.depth * 0.5);
  frontBlade.rotation.x = -0.12;
  frontBlade.castShadow = true;
  frontBlade.name = 'front-blade';
  group.add(frontBlade);

  for (const x of [-0.027, 0.027]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.005, 0.003), hubMaterial);
    headlight.position.set(x, spec.height * 0.02, -spec.depth * 0.475);
    headlight.name = 'front-led';
    group.add(headlight);
  }

  const frontMarker = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.58, 0.004, 0.004),
    bladeMaterial,
  );
  frontMarker.position.set(0, spec.height * 0.11, -spec.depth * 0.49);
  frontMarker.castShadow = true;
  frontMarker.name = 'front-marker';
  group.add(frontMarker);

  // Keep the visual tires slightly outside the shell so their silhouette is
  // readable from the isometric camera while remaining close to the physical
  // track width used by Rapier.
  const wheelX = spec.width * 0.48;
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
