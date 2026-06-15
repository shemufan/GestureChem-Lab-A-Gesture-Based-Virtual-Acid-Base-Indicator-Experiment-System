import assert from 'node:assert/strict';
import {
  getSceneObjectTransform,
  scenePointToWorld,
  STATIC_OBJECT_WORLD,
  WASTE_SINK_WORLD,
} from './sceneObjectLayout.js';

const sceneRect = { width: 1000, height: 650 };

assert.deepEqual(scenePointToWorld({ x: 500, y: 325, z: 0.58 }, sceneRect), [0, 0.917, 0]);
assert.deepEqual(scenePointToWorld({ x: 0, y: 0, z: 1 }, sceneRect), [-4.2, 1.7, -2.2]);

const staticAcid = { id: 'acid', kind: 'testTube', x: 340, y: 364, z: 0.6 };
const movingAcid = { ...staticAcid, x: 620, y: 260, z: 0.8, depthLayer: 'held' };

const resting = getSceneObjectTransform(staticAcid, sceneRect);
assert.deepEqual(resting.position, STATIC_OBJECT_WORLD.acid.position);
assert.equal(resting.rotation[2], 0);
assert.equal(resting.scale, 1);
assert.equal(resting.id, 'acid');
assert.equal(resting.kind, 'testTube');

const held = getSceneObjectTransform(movingAcid, sceneRect, { holdingObjectId: 'acid' });
assert.equal(held.id, 'acid');
assert.equal(held.kind, 'testTube');
assert.notDeepEqual(held.position, STATIC_OBJECT_WORLD.acid.position);
assert.equal(held.position[1] > resting.position[1], true);
assert.equal(held.rotation[2] < 0, true);
assert.equal(held.scale > 1, true);

assert.deepEqual(WASTE_SINK_WORLD.position, [3.25, 0.08, -0.95]);

console.log('sceneObjectLayout tests passed');
