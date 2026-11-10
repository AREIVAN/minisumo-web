import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PRACTICE_PUSHABLE_OBJECT_SPEC } from '../../src/domain/index';
import { createPushableObjectMesh } from '../../src/simulation/render/pushable-object-mesh';

describe('createPushableObjectMesh', () => {
  it('renders a cylinder body, grip band, and top cap within its declared radius', () => {
    const mesh = createPushableObjectMesh(PRACTICE_PUSHABLE_OBJECT_SPEC);
    const parts = mesh.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);

    expect(mesh.name).toBe('pushable-cylinder-target');
    expect(parts.map((part) => part.name)).toEqual([
      'target-cylinder-body',
      'target-cylinder-band',
      'target-cylinder-cap',
    ]);
    const radialExtent = Math.max(
      ...parts.map((part) => {
        const positions = part.geometry.getAttribute('position');
        let maxRadius = 0;
        for (let index = 0; index < positions.count; index += 1) {
          maxRadius = Math.max(maxRadius, Math.hypot(positions.getX(index), positions.getZ(index)));
        }
        return maxRadius;
      }),
    );
    expect(radialExtent).toBeLessThanOrEqual(PRACTICE_PUSHABLE_OBJECT_SPEC.radius + 0.000001);

    mesh.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
  });
});
