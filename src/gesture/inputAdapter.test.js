import assert from 'node:assert/strict';
import {
  createSpatialHandMapper,
  createSceneMapper,
  createStablePointFilter,
  estimateHandDepth,
  getHandAnchor,
  normalizedHandToScene,
} from './inputAdapter.js';

function makeLandmarks(scale = 1) {
  const cx = 0.5;
  const cy = 0.5;
  const spreadX = 0.08 * scale;
  const spreadY = 0.18 * scale;
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  lm[0] = { x: cx, y: cy + spreadY, z: 0 };
  lm[5] = { x: cx - spreadX, y: cy + spreadY * 0.25, z: 0 };
  lm[9] = { x: cx, y: cy + spreadY * 0.1, z: 0 };
  lm[13] = { x: cx + spreadX, y: cy + spreadY * 0.25, z: 0 };
  lm[17] = { x: cx + spreadX * 2, y: cy + spreadY * 0.45, z: 0 };
  lm[12] = { x: cx, y: cy - spreadY, z: 0 };
  lm[8] = { x: cx - spreadX * 1.2, y: cy - spreadY, z: 0 };
  return lm;
}

const anchor = getHandAnchor(makeLandmarks());
assert.equal(anchor.type, 'index');
assert.ok(Math.abs(anchor.x - 0.404) < 0.01);

const sceneEl = {
  getBoundingClientRect: () => ({ width: 1000, height: 600 }),
};
const mapper = createSceneMapper({ paddingX: 100, paddingY: 60 });
assert.deepEqual(mapper({ x: 0.5, y: 0.5 }, sceneEl), { x: 500, y: 300 });
assert.deepEqual(mapper({ x: 1.5, y: -1 }, sceneEl), { x: 100, y: 60 });
assert.deepEqual(normalizedHandToScene({ x: 0.5, y: 0.5 }, sceneEl), { x: 500, y: 300 });

const filter = createStablePointFilter({
  factor: 0.5,
  deadZone: 4,
  maxStep: 30,
  holdMs: 200,
  now: () => 1000,
});
assert.deepEqual(filter.update({ x: 100, y: 100 }, true), { x: 100, y: 100, z: 0 });
assert.deepEqual(filter.update({ x: 102, y: 101 }, true), { x: 100, y: 100, z: 0 });
assert.deepEqual(filter.update({ x: 200, y: 100 }, true), { x: 130, y: 100, z: 0 });
assert.deepEqual(filter.update({ x: 0, y: 0 }, false), { x: 130, y: 100, z: 0 });

const farDepth = estimateHandDepth(makeLandmarks(0.65));
const nearDepth = estimateHandDepth(makeLandmarks(1.45));
assert.ok(nearDepth.handSize > farDepth.handSize);
assert.ok(nearDepth.estimatedDepth > farDepth.estimatedDepth);

const spatialMapper = createSpatialHandMapper({
  paddingX: 100,
  paddingY: 60,
  minHandSize: 0.12,
  maxHandSize: 0.42,
});
const spatialPoint = spatialMapper({
  anchor: { x: 0.5, y: 0.5 },
  depth: nearDepth,
  sceneEl,
});
assert.equal(spatialPoint.x, 500);
assert.equal(spatialPoint.y, 300);
assert.ok(spatialPoint.z >= 0 && spatialPoint.z <= 1);

const filter3d = createStablePointFilter({
  factor: 0.5,
  zFactor: 0.25,
  deadZone: 4,
  zDeadZone: 0.04,
  maxStep: 30,
  holdMs: 200,
  now: () => 1000,
});
assert.deepEqual(filter3d.update({ x: 100, y: 100, z: 0.2 }, true), { x: 100, y: 100, z: 0.2 });
assert.deepEqual(filter3d.update({ x: 102, y: 101, z: 0.22 }, true), { x: 100, y: 100, z: 0.2 });
assert.deepEqual(filter3d.update({ x: 200, y: 100, z: 0.8 }, true), { x: 130, y: 100, z: 0.35 });

console.log('inputAdapter tests passed');
