import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function ScenePointerProjector({
  cursor,
  sceneSize,
  enabled,
  onWorldPoint,
}) {
  const { camera } = useThree();

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.35),
    []
  );
  const intersection = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!enabled) return;
    if (!cursor || !sceneSize?.width || !sceneSize?.height) return;

    ndc.set(
      (cursor.x / sceneSize.width) * 2 - 1,
      -(cursor.y / sceneSize.height) * 2 + 1
    );

    raycaster.setFromCamera(ndc, camera);

    const hit = raycaster.ray.intersectPlane(dragPlane, intersection);

    if (hit) {
      onWorldPoint?.({
        x: intersection.x,
        y: intersection.y,
        z: intersection.z,
      });
    }
  }, [
    enabled,
    cursor,
    sceneSize,
    camera,
    raycaster,
    ndc,
    dragPlane,
    intersection,
    onWorldPoint,
  ]);

  return null;
}
