import * as THREE from 'three';
import type { DohyoSpec } from '../../domain/index';

const BLACK_SURFACE_HEIGHT = 0.006;

function flatMaterial(
  color: THREE.ColorRepresentation,
  roughness = 0.78,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
}

export function createDohyoMesh(spec: DohyoSpec): THREE.Group {
  const group = new THREE.Group();
  group.name = 'dohyo';

  const exterior = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.92, metalness: 0.12 }),
  );
  exterior.rotation.x = -Math.PI / 2;
  exterior.position.y = -spec.height - 0.004;
  exterior.receiveShadow = true;
  exterior.name = 'exterior-floor';
  group.add(exterior);

  const grid = new THREE.GridHelper(3.6, 36, 0x273246, 0x121a29);
  grid.position.y = -0.009;
  grid.name = 'industrial-grid';
  group.add(grid);

  const dohyoBase = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.outerRadius, spec.outerRadius, spec.height, 96),
    flatMaterial(0x303b4d, 0.9),
  );
  dohyoBase.position.y = -spec.height / 2;
  dohyoBase.receiveShadow = true;
  dohyoBase.name = 'dohyo-base';
  group.add(dohyoBase);

  const blackSurface = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.innerRadius, spec.innerRadius, BLACK_SURFACE_HEIGHT, 96),
    flatMaterial(0x111720, 0.72),
  );
  blackSurface.position.y = BLACK_SURFACE_HEIGHT / 2;
  blackSurface.receiveShadow = true;
  blackSurface.name = 'black-interior';
  group.add(blackSurface);

  const tawara = new THREE.Mesh(
    new THREE.RingGeometry(spec.innerRadius, spec.outerRadius, 96),
    flatMaterial(0xe6edf2, 0.42),
  );
  tawara.rotation.x = -Math.PI / 2;
  tawara.position.y = BLACK_SURFACE_HEIGHT + 0.001;
  tawara.receiveShadow = true;
  tawara.name = 'white-tawara';
  group.add(tawara);

  const edgeAccent = new THREE.Mesh(
    new THREE.RingGeometry(spec.outerRadius + 0.004, spec.outerRadius + 0.008, 96),
    flatMaterial(0x52647b, 0.55),
  );
  edgeAccent.rotation.x = -Math.PI / 2;
  edgeAccent.position.y = 0.003;
  edgeAccent.name = 'dohyo-edge-accent';
  group.add(edgeAccent);

  const startMarkMaterial = flatMaterial(0xf6f8f5, 0.35);
  for (const z of [-0.05, 0.05]) {
    const startMark = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.01), startMarkMaterial);
    startMark.position.set(0, 0.012, z);
    startMark.name = 'starting-line';
    group.add(startMark);
  }

  return group;
}
