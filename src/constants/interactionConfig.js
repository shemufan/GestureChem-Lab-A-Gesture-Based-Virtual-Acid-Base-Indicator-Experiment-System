export const INTERACTION_CONFIG = {
  grabRadius: 90,
  reactionRadius: 150,
  snapDistance: 150,
  releaseGraceMs: 180,
  lostHandGraceMs: 220,
  depthTolerance: 0.78,
  grabZRange: [0.25, 1],
  grabGestures: ['pinch'],
  releaseGestures: ['open'],
  reactionZoneIds: ['beaker_zone'],
  snapZoneIds: ['beaker_zone'],
  objectGrabPadding: {
    x: 34,
    y: 34,
    z: 0.78,
  },
  zoneDropPadding: {
    x: 38,
    y: 38,
    z: 0.14,
  },
};

export function mergeInteractionConfig(overrides = {}) {
  return {
    ...INTERACTION_CONFIG,
    ...overrides,
    objectGrabPadding: {
      ...INTERACTION_CONFIG.objectGrabPadding,
      ...(overrides.objectGrabPadding || {}),
    },
    zoneDropPadding: {
      ...INTERACTION_CONFIG.zoneDropPadding,
      ...(overrides.zoneDropPadding || {}),
    },
  };
}
