import assert from 'node:assert/strict';
import { hasUsableVideoFrame, isInterruptedPlayError, isMostlyBlackFrame } from './camera.js';

assert.equal(
  isInterruptedPlayError(new DOMException('The play() request was interrupted by a new load request.', 'AbortError')),
  true,
);

assert.equal(
  isInterruptedPlayError(new Error('The play() request was interrupted by a call to pause().')),
  true,
);

assert.equal(
  isInterruptedPlayError(new DOMException('Permission denied', 'NotAllowedError')),
  false,
);

assert.equal(hasUsableVideoFrame({ readyState: 2, videoWidth: 640, videoHeight: 480 }), true);
assert.equal(hasUsableVideoFrame({ readyState: 1, videoWidth: 640, videoHeight: 480 }), false);
assert.equal(hasUsableVideoFrame({ readyState: 2, videoWidth: 0, videoHeight: 480 }), false);

assert.equal(isMostlyBlackFrame(new Uint8ClampedArray([
  0, 0, 0, 255,
  3, 2, 1, 255,
  8, 8, 8, 255,
  2, 2, 2, 255,
])), true);

assert.equal(isMostlyBlackFrame(new Uint8ClampedArray([
  20, 20, 20, 255,
  22, 22, 22, 255,
  25, 25, 25, 255,
  24, 24, 24, 255,
])), false);

assert.equal(isMostlyBlackFrame(new Uint8ClampedArray([
  0, 0, 0, 255,
  240, 240, 240, 255,
  15, 80, 140, 255,
  2, 2, 2, 255,
])), false);

console.log('camera tests passed');
