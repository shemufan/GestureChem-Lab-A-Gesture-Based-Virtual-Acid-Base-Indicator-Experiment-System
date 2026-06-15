import { useCallback, useRef } from 'react';
import {
  createSpatialHandMapper,
  createStablePointFilter,
  getHandAnchor,
  estimateHandDepth,
} from '../gesture/inputAdapter';
import { getFistConfidence, getPinchConfidence } from '../gesture/gestureController';

export function useVirtualHand3D(options = {}) {
  const mapperRef = useRef(createSpatialHandMapper({
    paddingX: 72,
    paddingY: 58,
    minHandSize: 0.12,
    maxHandSize: 0.42,
    ...options.mapper,
  }));
  const filterRef = useRef(createStablePointFilter({
    factor: 0.3,
    zFactor: 0.18,
    deadZone: 7,
    zDeadZone: 0.04,
    maxStep: 46,
    holdMs: 240,
    ...options.filter,
  }));

  return useCallback((result, primaryHand, sceneEl) => {
    const anchor = primaryHand
      ? getHandAnchor(primaryHand.landmarks)
      : { x: 0, y: 0, z: 0, type: 'palm' };
    const depth = primaryHand
      ? estimateHandDepth(primaryHand.landmarks, {
          minHandSize: 0.12,
          maxHandSize: 0.42,
        })
      : { handSize: 0, estimatedDepth: 0, bbox: null };
    const rawSpatial = result.detected
      ? mapperRef.current({
          anchor,
          depth,
          landmarks: primaryHand?.landmarks,
          sceneEl,
        })
      : { x: 0, y: 0, z: 0, rawX: 0, rawY: 0, handSize: 0, estimatedDepth: 0, depthLabel: 'far' };
    const cursorScene = filterRef.current.update(rawSpatial, result.detected);
    const confidence = primaryHand
      ? {
          fist: getFistConfidence(primaryHand.landmarks),
          pinch: getPinchConfidence(primaryHand.landmarks, { pinchThreshold: 0.05 }),
        }
      : { fist: 0, pinch: 0 };

    return {
      cursorScene,
      cursorVideo: result.detected ? { x: anchor.x, y: anchor.y } : result.cursorPos,
      anchor: anchor.type || 'palm',
      confidence,
      rawHand: {
        x: anchor.x,
        y: anchor.y,
        handSize: depth.handSize,
        estimatedDepth: depth.estimatedDepth,
      },
      spatial: {
        x: cursorScene.x,
        y: cursorScene.y,
        z: cursorScene.z,
        depthLabel: rawSpatial.depthLabel,
      },
    };
  }, []);
}
