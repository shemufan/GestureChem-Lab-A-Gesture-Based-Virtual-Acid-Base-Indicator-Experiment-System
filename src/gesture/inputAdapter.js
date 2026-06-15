import { getGestureLabel } from '../constants/labConfig.js';
import { distance2d, clamp, round3, normalizePoint } from './utils.js';

const EMPTY_POINT = { x: 0, y: 0 };
const EMPTY_POINT_3D = { x: 0, y: 0, z: 0 };
const defaultSceneMapper = createSceneMapper();

export function createInputState({
  detected = false,
  rawGesture = 'none',
  stableGesture = 'none',
  cursorScene = EMPTY_POINT_3D,
  cursorVideo = EMPTY_POINT,
  mode = 'gesture',
  anchor = 'palm',
  confidence = { fist: 0, pinch: 0 },
  rawHand = { x: 0, y: 0, handSize: 0, estimatedDepth: 0 },
  spatial = { x: 0, y: 0, z: 0, depthLabel: 'far' },
} = {}) {
  return {
    detected,
    rawGesture,
    stableGesture,
    gestureLabel: getGestureLabel(stableGesture),
    rawGestureLabel: getGestureLabel(rawGesture),
    cursorScene,
    cursorVideo,
    mode,
    anchor,
    confidence,
    rawHand,
    spatial,
    isHoldingGesture: stableGesture === 'pinch',
  };
}

export function eventToScenePoint(event, sceneEl, z = 0.72) {
  const rect = sceneEl?.getBoundingClientRect();
  if (!rect) return { x: event.clientX, y: event.clientY, z };
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    z,
  };
}

export function normalizedHandToScene(cursorPos, sceneEl) {
  return defaultSceneMapper(cursorPos, sceneEl);
}

export function getHandAnchor(landmarks) {
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 21) {
    return { ...EMPTY_POINT, type: 'index' };
  }

  const indexTip = landmarks[8] || EMPTY_POINT;
  return { x: indexTip.x, y: indexTip.y, z: indexTip.z || 0, type: 'index' };
}

export function estimateHandDepth(landmarks, options = {}) {
  const {
    minHandSize = 0.12,
    maxHandSize = 0.42,
  } = options;

  if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 21) {
    return {
      handSize: 0,
      estimatedDepth: 0,
      bbox: null,
    };
  }

  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;
  const bboxDiagonal = Math.sqrt(bboxWidth * bboxWidth + bboxHeight * bboxHeight);

  const palmLength = distance2d(landmarks[0], landmarks[12] || landmarks[9]);
  const palmWidth = distance2d(landmarks[5], landmarks[17]);
  const handSize = Math.max(bboxDiagonal, palmLength, palmWidth * 1.7);
  const estimatedDepth = clamp(
    (handSize - minHandSize) / (maxHandSize - minHandSize),
    0,
    1,
  );

  return {
    handSize,
    estimatedDepth,
    bbox: { minX, maxX, minY, maxY, width: bboxWidth, height: bboxHeight },
  };
}

export function createSceneMapper(options = {}) {
  const {
    paddingX = 48,
    paddingY = 42,
    mirrorX = true,
    inputBounds = {
      minX: 0.08,
      maxX: 0.92,
      minY: 0.08,
      maxY: 0.92,
    },
  } = options;

  return (cursorPos, sceneEl) => {
    const rect = sceneEl?.getBoundingClientRect();
    if (!rect) return EMPTY_POINT;

    const clampedX = clamp(cursorPos.x, inputBounds.minX, inputBounds.maxX);
    const clampedY = clamp(cursorPos.y, inputBounds.minY, inputBounds.maxY);
    const normalizedX = (clampedX - inputBounds.minX) / (inputBounds.maxX - inputBounds.minX);
    const normalizedY = (clampedY - inputBounds.minY) / (inputBounds.maxY - inputBounds.minY);

    const sceneX = paddingX + (mirrorX ? 1 - normalizedX : normalizedX)
      * Math.max(0, rect.width - paddingX * 2);
    const sceneY = paddingY + normalizedY * Math.max(0, rect.height - paddingY * 2);

    return {
      x: Math.round(sceneX),
      y: Math.round(sceneY),
    };
  };
}

export function createSpatialHandMapper(options = {}) {
  const {
    minHandSize = 0.12,
    maxHandSize = 0.42,
    depthLabels = { near: 0.68, mid: 0.34 },
    ...sceneOptions
  } = options;
  const sceneMapper = createSceneMapper(sceneOptions);

  return ({ anchor, depth, landmarks, sceneEl }) => {
    const depthInfo = depth || estimateHandDepth(landmarks, { minHandSize, maxHandSize });
    const scenePoint = sceneMapper(anchor || EMPTY_POINT, sceneEl);
    const z = clamp(depthInfo.estimatedDepth, 0, 1);

    return {
      ...scenePoint,
      z,
      rawX: anchor?.x || 0,
      rawY: anchor?.y || 0,
      handSize: depthInfo.handSize,
      estimatedDepth: z,
      depthLabel: z >= depthLabels.near ? 'near' : z >= depthLabels.mid ? 'mid' : 'far',
    };
  };
}

export function createStablePointFilter(options = {}) {
  const {
    factor = 0.32,
    zFactor = 0.18,
    deadZone = 6,
    zDeadZone = 0.04,
    maxStep = 42,
    holdMs = 220,
    now = () => performance.now(),
  } = options;

  let previous = null;
  let lastSeenAt = 0;

  return {
    update(point, detected = true) {
      const currentTime = now();

      if (!detected) {
        if (previous && currentTime - lastSeenAt <= holdMs) {
          return previous;
        }
        previous = null;
        return point ? normalizePoint(point) : EMPTY_POINT_3D;
      }

      const next = normalizePoint(point);
      lastSeenAt = currentTime;
      if (!previous) {
        previous = next;
        return previous;
      }

      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      const dz = next.z - previous.z;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const xyInDeadZone = distance <= deadZone;
      const zInDeadZone = Math.abs(dz) <= zDeadZone;

      if (xyInDeadZone && zInDeadZone) {
        return previous;
      }

      const z = zInDeadZone ? previous.z : round3(previous.z + dz * zFactor);

      if (xyInDeadZone) {
        previous = { ...previous, z };
        return previous;
      }

      const target = {
        x: previous.x + dx * factor,
        y: previous.y + dy * factor,
      };
      const targetDx = target.x - previous.x;
      const targetDy = target.y - previous.y;
      const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);

      if (targetDistance > maxStep) {
        const scale = maxStep / targetDistance;
        previous = {
          x: Math.round(previous.x + targetDx * scale),
          y: Math.round(previous.y + targetDy * scale),
          z,
        };
      } else {
        previous = {
          x: Math.round(target.x),
          y: Math.round(target.y),
          z,
        };
      }

      return previous;
    },
    reset() {
      previous = null;
      lastSeenAt = 0;
    },
  };
}

// (normalizePoint, distance2d, round3, clamp imported from ./utils.js)
