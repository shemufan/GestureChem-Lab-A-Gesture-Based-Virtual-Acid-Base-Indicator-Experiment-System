/**
 * Gesture Controller — gesture classification, stabilisation & smoothing.
 *
 * Exports:
 *   detectGesture(landmarks, options) → 'open' | 'pinch' | 'none'
 *   createGestureStabilizer(options)   → { update(raw) → stable }
 *   createCursorSmoother(options)      → { update(pos) → smoothed }
 */

import { distance2d } from './utils.js';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_PINCH_THRESHOLD = 0.05;
const DEFAULT_PINCH_FRAMES = 5;   // frames before pinch is confirmed
const DEFAULT_RELEASE_FRAMES = 3; // frames before open (release) is confirmed
const DEFAULT_SMOOTH_FACTOR = 0.35; // 0 = no smoothing, 1 = instant (no lag)
const FINGER_JOINTS = [
  { mcp: 5, pip: 6, tip: 8 },
  { mcp: 9, pip: 10, tip: 12 },
  { mcp: 13, pip: 14, tip: 16 },
  { mcp: 17, pip: 18, tip: 20 },
];

// ---------------------------------------------------------------------------
// Raw gesture detection
// ---------------------------------------------------------------------------

/**
 * Classify the current hand gesture from MediaPipe landmarks.
 *
 * Only two gesture classes: pinch (thumb-index close) and open.
 * Fist detection is intentionally removed — pinch is the sole interaction gesture.
 * MediaPipe z is intentionally excluded from the distance calculation.
 *
 * @param {Array<{x:number, y:number, z:number}>} landmarks
 * @param {Object} [options]
 * @param {number} [options.pinchThreshold=0.05]
 * @returns {'open' | 'pinch' | 'none'}
 */
export function detectGesture(landmarks, options = {}) {
  const {
    pinchThreshold = DEFAULT_PINCH_THRESHOLD,
  } = options;

  if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 21) {
    return 'none';
  }

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < pinchThreshold ? 'pinch' : 'open';
}

export function getFistConfidence(landmarks) {
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 21) {
    return 0;
  }

  const palmScale = Math.max(
    distance2d(landmarks[0], landmarks[9]),
    distance2d(landmarks[5], landmarks[17]),
    0.08,
  );

  const curledCount = FINGER_JOINTS.reduce((count, finger) => {
    const mcp = landmarks[finger.mcp];
    const pip = landmarks[finger.pip];
    const tip = landmarks[finger.tip];
    if (!mcp || !pip || !tip) return count;

    const tipToMcp = distance2d(tip, mcp);
    const pipToMcp = Math.max(distance2d(pip, mcp), 0.01);
    const tipToPalm = distance2d(tip, landmarks[9]);
    const tipBelowPip = tip.y > pip.y;
    const tipNearPalm = tip.y > mcp.y - 0.02;
    const yCurl = tipBelowPip && tipNearPalm;
    const foldedBack = tipToMcp <= pipToMcp * 1.38 && tipToPalm <= palmScale * 1.04;
    return count + (yCurl || foldedBack ? 1 : 0);
  }, 0);

  return curledCount / FINGER_JOINTS.length;
}

export function getPinchConfidence(landmarks, options = {}) {
  const { pinchThreshold = DEFAULT_PINCH_THRESHOLD } = options;
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 21) {
    return 0;
  }

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, Math.min(1, 1 - distance / pinchThreshold));
}

// ---------------------------------------------------------------------------
// Gesture stabiliser — debounce pinch/release across consecutive frames
// ---------------------------------------------------------------------------

/**
 * Create a gesture stabiliser that debounces raw gesture classifications.
 *
 * Prevents single-frame flicker: a pinch must be held for `pinchFrames`
 * consecutive frames before it's considered stable.  Conversely, a release
 * (open) must persist for `releaseFrames` frames before taking effect.
 * 'none' passes through immediately (hand left the frame).
 *
 * @param {Object} [options]
 * @param {number} [options.pinchFrames=5]
 * @param {number} [options.releaseFrames=3]
 * @returns {{ update: (raw:string) => string, getRaw: () => string, getStable: () => string }}
 */
export function createGestureStabilizer(options = {}) {
  const {
    pinchFrames = DEFAULT_PINCH_FRAMES,
    releaseFrames = DEFAULT_RELEASE_FRAMES,
    enterFrames = {},
    holdFrames = {},
  } = options;

  let stable = 'none';
  let raw = 'none';
  let pending = 'none';
  let consecutive = 0;
  let holdCounter = 0;

  return {
    /**
     * Feed a new raw frame. Returns the stable gesture after debounce.
     */
    update(nextRaw) {
      raw = nextRaw;

      // Hand disappeared — reset immediately
      if (nextRaw === 'none') {
        stable = 'none';
        pending = 'none';
        consecutive = 0;
        holdCounter = 0;
        return stable;
      }

      if (nextRaw === stable) {
        pending = 'none';
        consecutive = 0;
        holdCounter = 0;
        return stable;
      }

      const neededHold = holdFrames[stable] || 0;
      if (neededHold > 0 && holdCounter < neededHold) {
        holdCounter++;
        if (holdCounter < neededHold) {
          return stable;
        }
      }

      if (pending !== nextRaw) {
        pending = nextRaw;
        consecutive = 1;
      } else {
        consecutive++;
      }

      const needed = enterFrames[nextRaw]
        || (nextRaw === 'pinch' ? pinchFrames : releaseFrames);

      if (consecutive >= needed) {
        stable = nextRaw;
        pending = 'none';
        consecutive = 0;
        holdCounter = 0;
      }

      return stable;
    },

    getRaw: () => raw,
    getStable: () => stable,
  };
}

// ---------------------------------------------------------------------------
// Cursor smoother — exponential moving average for jitter reduction
// ---------------------------------------------------------------------------

/**
 * Create a cursor position smoother using exponential moving average.
 *
 * newPos = prevPos + factor * (rawPos - prevPos)
 *
 * factor closer to 0 = heavier smoothing (more lag).
 * factor closer to 1 = lighter smoothing (more responsive).
 *
 * @param {Object} [options]
 * @param {number} [options.factor=0.35]
 * @returns {{ update: (pos:{x,y}) => {x,y} }}
 */
export function createCursorSmoother(options = {}) {
  const { factor = DEFAULT_SMOOTH_FACTOR } = options;
  let prev = null;

  return {
    update(pos) {
      if (!pos) return prev || { x: 0, y: 0 };
      if (!prev) {
        prev = { x: pos.x, y: pos.y };
        return prev;
      }
      prev = {
        x: prev.x + factor * (pos.x - prev.x),
        y: prev.y + factor * (pos.y - prev.y),
      };
      return prev;
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// (distance2d imported from ./utils.js)
