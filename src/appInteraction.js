import { LEGACY_OBJECT_ID_MAP } from './constants/labConfig.js';

const DEFAULT_CLICK_TARGETS = {
  goggles: 'face_area',
  acid: 'beaker_zone',
  indicator: 'beaker_zone',
  base: 'beaker_zone',
  beaker: 'beaker_zone',
};

export function getClickDropTarget(objectId) {
  const standardObjectId = LEGACY_OBJECT_ID_MAP[objectId] || objectId;
  return DEFAULT_CLICK_TARGETS[standardObjectId] || 'table';
}

export function resolveDropZoneAtPoint(point, zones) {
  const zone = zones.find((candidate) => {
    const hitBox = candidate.dropZone || candidate;
    return (
      point.x >= hitBox.x - hitBox.width / 2 &&
      point.x <= hitBox.x + hitBox.width / 2 &&
      point.y >= hitBox.y - hitBox.height / 2 &&
      point.y <= hitBox.y + hitBox.height / 2
    );
  });
  return zone?.id || 'table';
}

export function toScenePoint(event, rect, z = 0.72) {
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    z,
  };
}
