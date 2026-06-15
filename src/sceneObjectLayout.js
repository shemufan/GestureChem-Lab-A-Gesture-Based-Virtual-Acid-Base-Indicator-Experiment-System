export const STATIC_OBJECT_WORLD = {
  beaker: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
  acid: { position: [-2.95, 0.3, 0], rotation: [0, 0, 0], scale: 1 },
  indicator: { position: [-2.5, 0.3, 0], rotation: [0, 0, 0], scale: 1 },
  base: { position: [-2.05, 0.3, 0], rotation: [0, 0, 0], scale: 1 },
  goggles: { position: [2.5, 0.15, 1], rotation: [0, 0, 0], scale: 1 },
};

export const WASTE_SINK_WORLD = {
  position: [3.25, 0.08, -0.95],
  rotation: [0, -0.24, 0],
  scale: 1,
};

const WORLD_WIDTH = 8.4;
const WORLD_DEPTH = 4.4;
const BASE_WORLD_Y = 0.08;

export function scenePointToWorld(point, sceneRect = {}) {
  const width = sceneRect.width || 1000;
  const height = sceneRect.height || 650;
  const normalizedX = clamp(point.x / width, 0, 1);
  const normalizedY = clamp(point.y / height, 0, 1);
  const z = clamp(point.z ?? 0.5, 0, 1);

  return [
    round3((normalizedX - 0.5) * WORLD_WIDTH),
    round3(BASE_WORLD_Y + (1 - normalizedY) * 1.28 + z * 0.34),
    round3((normalizedY - 0.5) * WORLD_DEPTH),
  ];
}

export function getSceneObjectTransform(object, sceneRect, options = {}) {
  const resting = STATIC_OBJECT_WORLD[object.id] || { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 };
  const isHeld = options.holdingObjectId === object.id;

  if (!isHeld) {
    return {
      id: object.id,
      kind: object.kind,
      position: resting.position,
      rotation: resting.rotation,
      scale: resting.scale,
      isHeld: false,
    };
  }

  const position = scenePointToWorld(object, sceneRect);
  return {
    id: object.id,
    kind: object.kind,
    position: [position[0], round3(position[1] + 0.28), position[2]],
    rotation: object.kind === 'testTube' ? [0.18, 0, -0.34] : [0.06, 0, -0.08],
    scale: 1.08,
    isHeld: true,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}
