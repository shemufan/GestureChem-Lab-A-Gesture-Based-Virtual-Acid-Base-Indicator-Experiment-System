import { STATIC_OBJECT_WORLD, DRAG_CONFIG } from '../scene/worldLayout';
import { findWorldDropZone } from '../scene/worldDropZones';

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
    hoveredObjectId: null,
    nearZoneId: null,
    dropEvent: null,
  };
}

export function updateDrag3D(state, input) {
  const {
    gesture,
    hoveredObjectId,
    dragPoint,
  } = input;

  const isPinching = gesture === 'pinch';

  // Already holding an object
  if (state.draggingObjectId) {
    if (isPinching && dragPoint) {
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
          [state.draggingObjectId]: nextPosition,
        },
        hoveredObjectId: state.draggingObjectId,
        nearZoneId: normalizedNearZoneId,
        dropEvent: null,
      };
    }

    // Release — not pinching, so drop
    const finalPosition = state.objectWorldPositions[state.draggingObjectId];
    const targetZone = findWorldDropZone(finalPosition);

    return {
      ...state,
      draggingObjectId: null,
      hoveredObjectId: null,
      nearZoneId: null,
      dropEvent: {
        objectId: state.draggingObjectId,
        targetZone,
      },
    };
  }

  // Not holding — pinch starts grab on hovered object
  if (isPinching && hoveredObjectId) {
    return {
      ...state,
      draggingObjectId: hoveredObjectId,
      hoveredObjectId,
      nearZoneId: null,
      dropEvent: null,
    };
  }

  // Not holding, not pinching — just hover
  return {
    ...state,
    hoveredObjectId,
    nearZoneId: null,
    dropEvent: null,
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
