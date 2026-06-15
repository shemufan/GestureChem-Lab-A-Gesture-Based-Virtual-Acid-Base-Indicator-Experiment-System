export function findObjectAtPoint(point, objects, options = {}) {
  if (!point || !Array.isArray(objects)) return null;
  const padding = options.padding ?? 0;

  const hits = objects.filter((object) => isPointInsideObject(point, object, padding));
  hits.sort((left, right) => getObjectArea(left) - getObjectArea(right));

  return hits[0]?.id || null;
}

export function createPinchClickController() {
  let wasPinching = false;

  return {
    update(gesture, { resolveObjectId, onObjectClick } = {}) {
      const isPinching = gesture === 'pinch';

      if (!isPinching) {
        if (gesture === 'open' || gesture === 'none') {
          wasPinching = false;
        }
        return null;
      }

      if (wasPinching) return null;
      wasPinching = true;

      const objectId = resolveObjectId?.() || null;
      if (!objectId) return null;

      onObjectClick?.(objectId);
      return objectId;
    },
    reset() {
      wasPinching = false;
    },
  };
}

function isPointInsideObject(point, object, padding) {
  if (!object || object.x == null || object.y == null) return false;
  const hitSize = getObjectHitSize(object);
  const width = hitSize.width + padding * 2;
  const height = hitSize.height + padding * 2;

  return (
    point.x >= object.x - width / 2
    && point.x <= object.x + width / 2
    && point.y >= object.y - height / 2
    && point.y <= object.y + height / 2
  );
}

function getObjectArea(object) {
  const hitSize = getObjectHitSize(object);
  return hitSize.width * hitSize.height;
}

function getObjectHitSize(object) {
  if (object.kind === 'testTube') {
    return {
      width: (object.width || 0) * 0.55,
      height: (object.height || 0) * 0.92,
    };
  }

  return {
    width: object.width || 0,
    height: object.height || 0,
  };
}
