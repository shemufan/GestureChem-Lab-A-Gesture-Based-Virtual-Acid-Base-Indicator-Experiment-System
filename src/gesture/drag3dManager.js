import { STATIC_OBJECT_WORLD, DRAG_CONFIG } from '../scene/worldLayout';
import { findWorldDropZone } from '../scene/worldDropZones';

const RELEASE_GRACE_MS = 220;

export function createDrag3DState() {
  return {
    objectWorldPositions: {
      acid: [...STATIC_OBJECT_WORLD.acid.position],
      indicator: [...STATIC_OBJECT_WORLD.indicator.position],
      base: [...STATIC_OBJECT_WORLD.base.position],
      goggles: [...STATIC_OBJECT_WORLD.goggles.position],
      beaker: [...STATIC_OBJECT_WORLD.beaker.position],
    },
    draggingObjectId: null,
    lockedObjectId: null,
    hoveredObjectId: null,
    nearZoneId: null,
    dropEvent: null,
    releaseStartedAt: null,
  };
}

export function updateDrag3D(state, input) {
  const {
    gesture,
    hoveredObjectId,
    dragPoint,
    now = Date.now(),
  } = input;

  const isPinching = gesture === 'pinch';
  const activeObjectId = state.lockedObjectId || state.draggingObjectId;

  // ═══════════════════════════════════════════════════════════════
  // 1. Locked state — already holding an object.
  //    Ignore input.hoveredObjectId completely.
  //    Only move or release the active object.
  // ═══════════════════════════════════════════════════════════════
  if (activeObjectId) {
    if (isPinching) {
      if (!dragPoint) {
        return {
          ...state,
          draggingObjectId: activeObjectId,
          lockedObjectId: activeObjectId,
          hoveredObjectId: activeObjectId,
          dropEvent: null,
          releaseStartedAt: null,
        };
      }

      const nextPosition = [
        dragPoint[0],
        DRAG_CONFIG.heldObjectY,
        dragPoint[2],
      ];

      const nearZoneId = findWorldDropZone(nextPosition);
      const normalizedNearZoneId = nearZoneId === 'table' ? null : nearZoneId;

      return {
        ...state,
        objectWorldPositions: {
          ...state.objectWorldPositions,
          [activeObjectId]: nextPosition,
        },
        draggingObjectId: activeObjectId,
        lockedObjectId: activeObjectId,
        hoveredObjectId: activeObjectId,
        nearZoneId: normalizedNearZoneId,
        dropEvent: null,
        releaseStartedAt: null,
      };
    }

    // Non-pinch while locked — do NOT release immediately.
    // Wait through the release grace window to absorb gesture jitter.
    const releaseStartedAt = state.releaseStartedAt ?? now;

    if (now - releaseStartedAt < RELEASE_GRACE_MS) {
      return {
        ...state,
        draggingObjectId: activeObjectId,
        lockedObjectId: activeObjectId,
        hoveredObjectId: activeObjectId,
        dropEvent: null,
        releaseStartedAt,
      };
    }

    // Grace period exhausted — confirm release.
    const finalPosition = state.objectWorldPositions[activeObjectId];
    const targetZone = findWorldDropZone(finalPosition);

    return {
      ...state,
      draggingObjectId: null,
      lockedObjectId: null,
      hoveredObjectId: null,
      nearZoneId: null,
      releaseStartedAt: null,
      dropEvent: {
        objectId: activeObjectId,
        targetZone,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. Idle state — only now can a new object be grabbed.
  // ═══════════════════════════════════════════════════════════════
  if (isPinching && hoveredObjectId) {
    return {
      ...state,
      draggingObjectId: hoveredObjectId,
      lockedObjectId: hoveredObjectId,
      hoveredObjectId,
      nearZoneId: null,
      dropEvent: null,
      releaseStartedAt: null,
    };
  }

  // 3. Idle hover state.
  return {
    ...state,
    hoveredObjectId,
    nearZoneId: null,
    dropEvent: null,
    releaseStartedAt: null,
  };
}

export function resetDroppedObjectIfNeeded(state, objectId) {
  if (!objectId || !STATIC_OBJECT_WORLD[objectId]) return state;

  return {
    ...state,
    objectWorldPositions: {
      ...state.objectWorldPositions,
      [objectId]: [...STATIC_OBJECT_WORLD[objectId].position],
    },
  };
}
