import * as THREE from 'three';
import type { PushableObjectSpec } from '../../domain/index';

export function createPushableObjectMesh(spec: PushableObjectSpec): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pushable-cylinder-target';

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xd87524,
    roughness: 0.46,
    metalness: 0.28,
  });
  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2bd53,
    roughness: 0.34,
    metalness: 0.42,
  });
  const bandMaterial = new THREE.MeshStandardMaterial({
    color: 0x202a38,
    roughness: 0.5,
    metalness: 0.52,
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.radius, spec.radius, spec.height, 24),
    bodyMaterial,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = 'target-cylinder-body';
  group.add(body);

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.radius + 0.0006, spec.radius + 0.0006, 0.006, 24),
    bandMaterial,
  );
  band.castShadow = true;
  band.name = 'target-cylinder-band';
  group.add(band);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.radius * 0.78, spec.radius * 0.78, 0.002, 24),
    capMaterial,
  );
  cap.position.y = spec.height / 2 + 0.001;
  cap.castShadow = true;
  cap.name = 'target-cylinder-cap';
  group.add(cap);

  return group;
}
