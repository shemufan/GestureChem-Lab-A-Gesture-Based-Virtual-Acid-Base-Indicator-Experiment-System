import assert from 'node:assert/strict';
import {
  createGestureStabilizer,
  detectGesture,
} from './gestureController.js';

function createOpenHand() {
  const lm = Array.from({ length: 21 }, (_, index) => ({
    x: 0.5,
    y: 0.8 - index * 0.005,
    z: 0,
  }));

  lm[0] = { x: 0.5, y: 0.8, z: 0 };
  lm[4] = { x: 0.32, y: 0.5, z: 0 };

  for (const [mcp, pip, tip, x] of [
    [5, 6, 8, 0.42],
    [9, 10, 12, 0.5],
    [13, 14, 16, 0.58],
    [17, 18, 20, 0.66],
  ]) {
    lm[mcp] = { x, y: 0.62, z: 0 };
    lm[pip] = { x, y: 0.43, z: 0 };
    lm[tip] = { x, y: 0.2, z: 0 };
  }

  return lm;
}

function createFistHand() {
  const lm = createOpenHand();
  for (const [mcp, pip, tip, x] of [
    [5, 6, 8, 0.42],
    [9, 10, 12, 0.5],
    [13, 14, 16, 0.58],
    [17, 18, 20, 0.66],
  ]) {
    lm[mcp] = { x, y: 0.62, z: 0 };
    lm[pip] = { x, y: 0.54, z: 0 };
    lm[tip] = { x, y: 0.68, z: 0 };
  }
  lm[4] = { x: 0.44, y: 0.66, z: 0 };
  return lm;
}

function createRelaxedOpenHand() {
  const lm = createOpenHand();
  for (const [mcp, pip, tip, x] of [
    [5, 6, 8, 0.42],
    [9, 10, 12, 0.5],
    [13, 14, 16, 0.58],
    [17, 18, 20, 0.66],
  ]) {
    lm[mcp] = { x, y: 0.62, z: 0 };
    lm[pip] = { x, y: 0.48, z: 0 };
    lm[tip] = { x, y: 0.38, z: 0 };
  }
  return lm;
}

function createRotatedFistHand() {
  const lm = createOpenHand();
  for (const [mcp, pip, tip, x] of [
    [5, 6, 8, 0.42],
    [9, 10, 12, 0.5],
    [13, 14, 16, 0.58],
    [17, 18, 20, 0.66],
  ]) {
    lm[mcp] = { x, y: 0.62, z: 0 };
    lm[pip] = { x: x + 0.045, y: 0.58, z: 0 };
    lm[tip] = { x: x + 0.075, y: 0.6, z: 0 };
  }
  lm[4] = { x: 0.46, y: 0.67, z: 0 };
  return lm;
}

function createPinchHand() {
  const lm = createOpenHand();
  lm[4] = { x: 0.405, y: 0.24, z: 0 };
  lm[8] = { x: 0.42, y: 0.23, z: 0 };
  return lm;
}

assert.equal(detectGesture(createOpenHand()), 'open');
assert.equal(detectGesture(createRelaxedOpenHand()), 'open');
assert.equal(detectGesture(createFistHand()), 'fist');
assert.equal(detectGesture(createRotatedFistHand()), 'fist');
assert.equal(detectGesture(createPinchHand()), 'pinch');
assert.equal(detectGesture(null), 'none');

const stabilizer = createGestureStabilizer({
  enterFrames: { fist: 3, open: 2, pinch: 2 },
  releaseFrames: 2,
  holdFrames: { fist: 1 },
});

assert.equal(stabilizer.update('fist'), 'none');
assert.equal(stabilizer.update('fist'), 'none');
assert.equal(stabilizer.update('fist'), 'fist');
assert.equal(stabilizer.update('open'), 'fist');
assert.equal(stabilizer.update('fist'), 'fist');
assert.equal(stabilizer.update('open'), 'fist');
assert.equal(stabilizer.update('open'), 'open');

console.log('gestureController tests passed');
