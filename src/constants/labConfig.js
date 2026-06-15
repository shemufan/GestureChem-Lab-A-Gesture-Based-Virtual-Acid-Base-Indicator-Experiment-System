import { INTERACTION_CONFIG } from './interactionConfig.js';

export const LAB_OBJECT_IDS = ['goggles', 'acid', 'indicator', 'base', 'beaker'];
export const LAB_ZONE_IDS = ['face_area', 'beaker_zone', 'waste_bin', 'table'];

export const LAB_OBJECTS = {
  goggles: {
    id: 'goggles',
    label: '护目镜',
    shortLabel: '护目镜',
    kind: 'goggles',
    width: 118,
    height: 110,
    z: 0.45,
    px: 0.73,
    py: 0.36,
  },
  acid: {
    id: 'acid',
    label: '盐酸',
    shortLabel: 'HCl',
    kind: 'testTube',
    width: 96,
    height: 160,
    z: 0.6,
    px: 0.34,
    py: 0.56,
  },
  indicator: {
    id: 'indicator',
    label: '酚酞指示剂',
    shortLabel: '酚酞',
    kind: 'testTube',
    width: 96,
    height: 160,
    z: 0.6,
    px: 0.42,
    py: 0.56,
  },
  base: {
    id: 'base',
    label: '氢氧化钠',
    shortLabel: 'NaOH',
    kind: 'testTube',
    width: 96,
    height: 160,
    z: 0.6,
    px: 0.5,
    py: 0.56,
  },
  beaker: {
    id: 'beaker',
    label: '烧杯',
    shortLabel: '烧杯',
    kind: 'beaker',
    width: 160,
    height: 170,
    z: 0.58,
    px: 0.5,
    py: 0.58,
  },
};

export const LAB_ZONES = {
  face_area: {
    id: 'face_area',
    label: '面部安全区',
    sceneLabel: '护目镜佩戴区',
    px: 0.73,
    py: 0.28,
    pw: 0.22,
    ph: 0.2,
    z: 0.45,
    depthRange: [0.18, 1],
  },
  beaker_zone: {
    id: 'beaker_zone',
    label: '烧杯反应区',
    sceneLabel: '烧杯反应区',
    px: 0.5,
    py: 0.58,
    pw: 0.28,
    ph: 0.32,
    z: 0.58,
    depthRange: [0.25, 1],
  },
  waste_bin: {
    id: 'waste_bin',
    label: '废液桶',
    sceneLabel: '废液处理区',
    px: 0.82,
    py: 0.76,
    pw: 0.18,
    ph: 0.2,
    z: 0.72,
    depthRange: [0.35, 1],
  },
  table: {
    id: 'table',
    label: '实验台',
    sceneLabel: '实验台',
  },
};

export const GESTURE_LABELS = {
  none: '未检测',
  open: '张开 / 待点击',
  pinch: '捏合 / 点击',
  fist: '握拳 / 不触发',
};

export const LEGACY_OBJECT_ID_MAP = {
  acid_bottle: 'acid',
  indicator_bottle: 'indicator',
  base_bottle: 'base',
};

export const LEGACY_ZONE_ID_MAP = {
  user_head: 'face_area',
  beaker: 'beaker_zone',
};

export function getObjectLabel(objectId, options = {}) {
  const object = LAB_OBJECTS[objectId] || LAB_OBJECTS[LEGACY_OBJECT_ID_MAP[objectId]];
  if (!object) return objectId;
  return options.short ? object.shortLabel : object.label;
}

export function getZoneLabel(zoneId, options = {}) {
  const zone = LAB_ZONES[zoneId] || LAB_ZONES[LEGACY_ZONE_ID_MAP[zoneId]];
  if (!zone) return zoneId;
  return options.scene ? zone.sceneLabel : zone.label;
}

export function getGestureLabel(gesture) {
  return GESTURE_LABELS[gesture] || gesture;
}

export function buildObjects(sceneRect) {
  const width = sceneRect?.width || 1000;
  const height = sceneRect?.height || 650;

  return LAB_OBJECT_IDS.map((objectId) => {
    const object = LAB_OBJECTS[objectId];
    return {
      ...object,
      x: object.px * width,
      y: object.py * height,
      grabZone: buildObjectGrabZone(object, width, height),
    };
  });
}

export function buildZones(sceneRect) {
  const width = sceneRect?.width || 1000;
  const height = sceneRect?.height || 650;

  return LAB_ZONE_IDS
    .filter((zoneId) => zoneId !== 'table')
    .map((zoneId) => {
      const zone = LAB_ZONES[zoneId];
      return {
        id: zone.id,
        label: zone.label,
        sceneLabel: zone.sceneLabel,
        x: zone.px * width,
        y: zone.py * height,
        z: zone.z,
        width: zone.pw * width,
        height: zone.ph * height,
        depthRange: zone.depthRange,
        dropZone: buildDropZone(zone, width, height),
        reactionZone: zone.id === 'beaker_zone'
          ? buildReactionZone(zone, width, height)
          : null,
      };
    });
}

function buildObjectGrabZone(object, sceneWidth, sceneHeight) {
  const padding = INTERACTION_CONFIG.objectGrabPadding;
  const zoneWidth = object.width + padding.x * 2;
  const zoneHeight = object.height + padding.y * 2;
  return {
    x: object.px * sceneWidth,
    y: object.py * sceneHeight,
    z: object.z,
    width: zoneWidth,
    height: zoneHeight,
    radius: Math.max(zoneWidth, zoneHeight) / 2,
    depthTolerance: padding.z,
  };
}

function buildDropZone(zone, sceneWidth, sceneHeight) {
  const padding = INTERACTION_CONFIG.zoneDropPadding;
  const zoneWidth = zone.pw * sceneWidth + padding.x * 2;
  const zoneHeight = zone.ph * sceneHeight + padding.y * 2;
  return {
    x: zone.px * sceneWidth,
    y: zone.py * sceneHeight,
    z: zone.z,
    width: zoneWidth,
    height: zoneHeight,
    depthRange: expandDepthRange(zone.depthRange, padding.z),
  };
}

function buildReactionZone(zone, sceneWidth, sceneHeight) {
  const dropZone = buildDropZone(zone, sceneWidth, sceneHeight);
  return {
    ...dropZone,
    radius: Math.max(dropZone.width, dropZone.height) / 2 + INTERACTION_CONFIG.reactionRadius * 0.25,
  };
}

function expandDepthRange(depthRange = [0, 1], amount = 0) {
  return [
    Math.max(0, depthRange[0] - amount),
    Math.min(1, depthRange[1] + amount),
  ];
}
