import { mergeInteractionConfig } from '../constants/interactionConfig.js';
import { distance2d, distance3d, normalizeZ } from './utils.js';

export function createDragState(objects) {
  return {
    objects: objects.map((object) => ({ z: 0.35, depthLayer: 'table', ...object })),
    holdingObjectId: null,
    hoveredObjectId: null,
    nearestObjectId: null,
    nearestDistance: null,
    nearZoneId: null,
    snapZoneId: null,
    lastValidDropZoneId: null,
    lastValidDropZoneAt: null,
    isInsideGrabZone: false,
    isInsideReactionZone: false,
    dropReason: null,
    dropEvent: null,
    releaseStartedAt: null,
  };
}

export function updateDrag(state, cursorPagePos, gestureType, options = {}) {
  if (!cursorPagePos || (cursorPagePos.x == null && cursorPagePos.y == null)) {
    return {
      ...state,
      holdingObjectId: null,
      hoveredObjectId: null,
      nearestObjectId: null,
      nearestDistance: null,
      nearZoneId: null,
      snapZoneId: null,
      isInsideGrabZone: false,
      isInsideReactionZone: false,
      dropReason: null,
      dropEvent: null,
      releaseStartedAt: null,
      lastValidDropZoneId: null,
      lastValidDropZoneAt: null,
    };
  }

  const config = normalizeOptions(options);
  const now = options.now ?? Date.now();
  const cursor = normalizeCursor(cursorPagePos);
  const isGrabGesture = config.grabGestures.includes(gestureType);
  const objectHit = findNearestObject(state.objects, cursor, config);
  const hoveredObjectId = objectHit.isInsideGrabZone ? objectHit.object?.id || null : null;

  if (state.holdingObjectId) {
    if (isGrabGesture) {
      return continueHolding(state, cursor, config, now, {
        objectHit,
        hoveredObjectId,
      });
    }

    return releaseOrHoldDuringGrace(state, cursor, config, now, {
      objectHit,
      hoveredObjectId,
      gestureType,
    });
  }

  if (isGrabGesture && objectHit.isInsideGrabZone && objectHit.object) {
    return grabObject(state, cursor, now, {
      objectHit,
      hoveredObjectId,
    });
  }

  return {
    ...state,
    holdingObjectId: null,
    hoveredObjectId,
    nearestObjectId: objectHit.object?.id || null,
    nearestDistance: objectHit.distance,
    nearZoneId: null,
    snapZoneId: null,
    isInsideGrabZone: objectHit.isInsideGrabZone,
    isInsideReactionZone: false,
    dropReason: null,
    dropEvent: null,
    releaseStartedAt: null,
  };
}

function grabObject(state, cursor, now, context) {
  const { objectHit, hoveredObjectId } = context;
  return {
    ...state,
    objects: moveHeldObject(state.objects, objectHit.object.id, cursor, null),
    holdingObjectId: objectHit.object.id,
    hoveredObjectId,
    nearestObjectId: objectHit.object.id,
    nearestDistance: objectHit.distance,
    nearZoneId: null,
    snapZoneId: null,
    lastValidDropZoneId: null,
    lastValidDropZoneAt: null,
    isInsideGrabZone: true,
    isInsideReactionZone: false,
    dropReason: null,
    dropEvent: null,
    releaseStartedAt: null,
    grabbedAt: now,
  };
}

function continueHolding(state, cursor, config, now, context) {
  const dropHit = findDropZone(cursor, config.zones, config);
  const snapZone = dropHit.snapZone || dropHit.zone;
  const nextValidDropZoneId = dropHit.zone?.id || state.lastValidDropZoneId;
  const nextValidDropZoneAt = dropHit.zone ? now : state.lastValidDropZoneAt;

  return {
    ...state,
    objects: moveHeldObject(state.objects, state.holdingObjectId, cursor, snapZone),
    holdingObjectId: state.holdingObjectId,
    hoveredObjectId: state.holdingObjectId,
    nearestObjectId: context.objectHit.object?.id || null,
    nearestDistance: context.objectHit.distance,
    nearZoneId: dropHit.zone?.id || snapZone?.id || null,
    snapZoneId: snapZone?.id || null,
    lastValidDropZoneId: nextValidDropZoneId,
    lastValidDropZoneAt: nextValidDropZoneAt,
    isInsideGrabZone: true,
    isInsideReactionZone: Boolean(dropHit.reactionZone || (snapZone && config.reactionZoneIds?.includes(snapZone.id))),
    dropReason: null,
    dropEvent: null,
    releaseStartedAt: null,
  };
}

function releaseOrHoldDuringGrace(state, cursor, config, now, context) {
  const heldObject = state.objects.find((object) => object.id === state.holdingObjectId);
  const currentDropZone = heldObject ? findDropZone(heldObject, config.zones, config).zone : null;
  const graceDropZone = findGraceDropZone(state, config.zones, config, now);

  if (currentDropZone || graceDropZone) {
    const targetZone = currentDropZone?.id || graceDropZone.id;
    return releaseObject(state, context, {
      targetZone,
      reason: currentDropZone ? 'current_zone' : 'grace_zone',
    });
  }

  const graceMs = config.releaseGestures.includes(context.gestureType)
    ? config.releaseGraceMs
    : config.lostHandGraceMs;
  const releaseStartedAt = state.releaseStartedAt ?? now;
  if (now - releaseStartedAt < graceMs) {
    return {
      ...state,
      hoveredObjectId: state.holdingObjectId,
      nearestObjectId: context.objectHit.object?.id || null,
      nearestDistance: context.objectHit.distance,
      nearZoneId: null,
      snapZoneId: null,
      isInsideGrabZone: true,
      isInsideReactionZone: false,
      dropReason: 'release_grace',
      dropEvent: null,
      releaseStartedAt,
    };
  }

  return releaseObject(state, context, {
    targetZone: 'table',
    reason: 'table',
  });
}

function releaseObject(state, context, { targetZone, reason }) {
  return {
    ...state,
    holdingObjectId: null,
    hoveredObjectId: null,
    nearestObjectId: context.objectHit.object?.id || null,
    nearestDistance: context.objectHit.distance,
    nearZoneId: null,
    snapZoneId: null,
    lastValidDropZoneId: null,
    lastValidDropZoneAt: null,
    isInsideGrabZone: context.objectHit.isInsideGrabZone,
    isInsideReactionZone: false,
    dropReason: reason,
    dropEvent: { objectId: state.holdingObjectId, targetZone },
    releaseStartedAt: null,
  };
}

function moveHeldObject(objects, objectId, cursor, snapZone) {
  const target = snapZone || cursor;
  return objects.map((object) =>
    object.id === objectId
      ? {
          ...object,
          x: target.x,
          y: target.y,
          z: normalizeZ(cursor.z, object.z),
          depthLayer: 'held',
        }
      : object,
  );
}

function findNearestObject(objects, cursor, config) {
  let nearest = null;
  let nearestDistance = Infinity;
  let nearestInside = false;

  for (const object of objects) {
    const grabZone = getGrabZone(object, config);
    const distance = distance3d(cursor, grabZone);
    const inside = isInsideObjectGrabZone(cursor, grabZone, config);
    const rank = inside ? distance : distance + grabZone.radius;

    if (rank < nearestDistance) {
      nearest = object;
      nearestDistance = rank;
      nearestInside = inside;
    }
  }

  return {
    object: nearest,
    distance: Number.isFinite(nearestDistance) ? Math.round(nearestDistance) : null,
    isInsideGrabZone: nearestInside,
  };
}

function findDropZone(point, zones, config) {
  let zone = null;
  let reactionZone = null;
  let snapZone = null;

  for (const candidate of zones) {
    const dropZone = candidate.dropZone || candidate;
    if (!zone && isInsideZone(point, dropZone)) {
      zone = candidate;
    }

    if (candidate.reactionZone && isInsideReactionZone(point, candidate.reactionZone, config)) {
      reactionZone = candidate;
    }

    if (
      config.snapZoneIds?.includes(candidate.id) &&
      distance2d(point, candidate) <= config.snapDistance &&
      isInsideDepthRange(point, candidate.dropZone || candidate)
    ) {
      snapZone = candidate;
    }
  }

  return {
    zone: zone || reactionZone || snapZone,
    reactionZone,
    snapZone,
  };
}

function findGraceDropZone(state, zones, config, now) {
  if (!state.lastValidDropZoneId || state.lastValidDropZoneAt === null) return null;
  if (now - state.lastValidDropZoneAt > config.releaseGraceMs) return null;
  return zones.find((zone) => zone.id === state.lastValidDropZoneId) || null;
}

function getGrabZone(object, config) {
  if (object.grabZone) return object.grabZone;
  const padding = config.objectGrabPadding;
  const width = object.width + padding.x * 2;
  const height = object.height + padding.y * 2;
  return {
    x: object.x,
    y: object.y,
    z: normalizeZ(object.z, 0.35),
    width,
    height,
    radius: Math.max(width, height) / 2,
    depthTolerance: config.depthTolerance,
  };
}

function isInsideObjectGrabZone(cursor, grabZone, config) {
  const cursorZ = normalizeZ(cursor.z, 0.35);
  if (cursorZ < config.grabZRange[0] || cursorZ > config.grabZRange[1]) return false;
  const depthTolerance = grabZone.depthTolerance ?? config.depthTolerance;
  if (Math.abs(cursorZ - normalizeZ(grabZone.z, 0.35)) > depthTolerance) return false;
  return isInsideRect(cursor, grabZone) || distance2d(cursor, grabZone) <= grabZone.radius;
}

function isInsideZone(point, zone) {
  return isInsideRect(point, zone) && isInsideDepthRange(point, zone);
}

function isInsideReactionZone(point, zone, config) {
  return isInsideZone(point, zone) || distance2d(point, zone) <= (zone.radius || config.reactionRadius);
}

function isInsideRect(point, rect) {
  return (
    point.x >= rect.x - rect.width / 2 &&
    point.x <= rect.x + rect.width / 2 &&
    point.y >= rect.y - rect.height / 2 &&
    point.y <= rect.y + rect.height / 2
  );
}

function isInsideDepthRange(point, zone) {
  const depthRange = zone.depthRange || [0, 1];
  const z = normalizeZ(point.z, zone.z || 0.5);
  return z >= depthRange[0] && z <= depthRange[1];
}

function normalizeOptions(options) {
  const config = mergeInteractionConfig(options);
  return {
    ...config,
    zones: options.zones || [],
    grabRadius: options.grabRadius ?? config.grabRadius,
    depthTolerance: options.depthTolerance ?? options.grabDepthRange ?? config.depthTolerance,
    releaseGestures: options.releaseGestures || config.releaseGestures || ['open'],
  };
}

function normalizeCursor(cursor) {
  return {
    x: cursor?.x || 0,
    y: cursor?.y || 0,
    z: normalizeZ(cursor?.z, 0.35),
  };
}

// (normalizeZ, distance2d, distance3d imported from ./utils.js)
