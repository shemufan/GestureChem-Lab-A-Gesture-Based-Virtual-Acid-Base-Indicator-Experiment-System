import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DRAG_CONFIG } from '../scene/worldLayout';

export default function ScenePointerController({
  cursor,
  sceneSize,
  hitboxesRef,
  lockedObjectId,
  onPointer3D,
}) {
  const { camera } = useThree();

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_CONFIG.dragPlaneY),
    []
  );
  const intersection = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!cursor || !sceneSize?.width || !sceneSize?.height) return;

    ndc.set(
      (cursor.x / sceneSize.width) * 2 - 1,
      -(cursor.y / sceneSize.height) * 2 + 1
    );

    raycaster.setFromCamera(ndc, camera);

    let hoveredObjectId = null;

    if (lockedObjectId) {
      // Locked — skip raycaster, force the locked object.
      // The drag3dManager is the final authority; this just avoids
      // unnecessary raycaster traversal.
      hoveredObjectId = lockedObjectId;
    } else {
      const currentHitboxes = hitboxesRef.current;
      const hitboxObjects = currentHitboxes instanceof Map
        ? Array.from(currentHitboxes.values())
        : currentHitboxes || [];

      const hits = raycaster.intersectObjects(hitboxObjects, true);
      const draggableHit = hits.find((hit) => hit.object?.userData?.draggable);
      hoveredObjectId = draggableHit?.object?.userData?.objectId || null;
    }

    const planeHit = raycaster.ray.intersectPlane(dragPlane, intersection);
    const dragPoint = planeHit
      ? [intersection.x, intersection.y, intersection.z]
      : null;

    onPointer3D?.({
      hoveredObjectId,
      dragPoint,
    });
  }, [
    cursor,
    sceneSize,
    camera,
    raycaster,
    ndc,
    dragPlane,
    intersection,
    hitboxesRef,
    lockedObjectId,
    onPointer3D,
  ]);

  return null;
}
