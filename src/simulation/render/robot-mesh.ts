import * as THREE from 'three';
import type { RobotSpec } from '../../domain/index';

const WHEEL_RADIUS = 0.016;
const WHEEL_WIDTH = 0.012;

function createWheel(material: THREE.Material, x: number, z: number): THREE.Mesh {
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 12),
    material,
  );
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, -0.009, z);
  wheel.castShadow = true;
  return wheel;
}

export function createRobotMesh(spec: RobotSpec): THREE.Group {
  const group = new THREE.Group();
  group.name = 'practice-robot';

  const chassisMaterial = new THREE.MeshStandardMaterial({
    color: 0xd94c38,
    roughness: 0.45,
    metalness: 0.55,
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

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width, spec.height, spec.depth),
    chassisMaterial,
  );
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  chassis.name = 'chassis';
  group.add(chassis);

  const upperPlate = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.78, 0.008, spec.depth * 0.72),
    trimMaterial,
  );
  upperPlate.position.y = spec.height * 0.52;
  upperPlate.castShadow = true;
  upperPlate.name = 'top-plate';
  group.add(upperPlate);

  const frontMarker = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.72, 0.006, 0.008),
    new THREE.MeshStandardMaterial({ color: 0x77e5c0, roughness: 0.35, metalness: 0.45 }),
  );
  frontMarker.position.set(0, spec.height * 0.18, -spec.depth * 0.43);
  frontMarker.castShadow = true;
  frontMarker.name = 'front-marker';
  group.add(frontMarker);

  const wheelX = 0.036;
  const wheelZ = 0.028;
  for (const x of [-wheelX, wheelX]) {
    for (const z of [-wheelZ, wheelZ]) {
      group.add(createWheel(wheelMaterial, x, z));
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, WHEEL_WIDTH + 0.001, 10),
        hubMaterial,
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.set(x, -0.009, z);
      hub.castShadow = true;
      hub.name = 'wheel-hub';
      group.add(hub);
    }
  }

  return group;
}
