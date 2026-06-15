import assert from 'node:assert/strict';
import { LAB_OBJECT_IDS, LAB_ZONE_IDS } from '../constants/labConfig.js';
import { INTERACTION_CONFIG } from '../constants/interactionConfig.js';
import { createDragState, updateDrag } from '../gesture/dragManager.js';
import { createInputState } from '../gesture/inputAdapter.js';
import { createPinchClickController } from '../gesture/pinchClickController.js';

assert.deepEqual(LAB_OBJECT_IDS, ['goggles', 'acid', 'indicator', 'base', 'beaker']);
assert.deepEqual(LAB_ZONE_IDS, ['face_area', 'beaker_zone', 'waste_bin', 'table']);
assert.equal(INTERACTION_CONFIG.grabGestures.includes('fist'), false);
assert.equal(INTERACTION_CONFIG.grabGestures.includes('pinch'), true);
assert.equal(INTERACTION_CONFIG.releaseGestures.includes('open'), true);

const objects = [
  { id: 'acid', x: 100, y: 100, z: 0.7, width: 80, height: 120 },
];
const zones = [
  { id: 'beaker_zone', x: 240, y: 100, z: 0.7, width: 120, height: 120, depthRange: [0, 1] },
];

let drag = createDragState(objects);
drag = updateDrag(drag, { x: 100, y: 100, z: 0.7 }, 'pinch', { zones });
assert.equal(drag.holdingObjectId, 'acid');
drag = updateDrag(drag, { x: 240, y: 100, z: 0.7 }, 'pinch', { zones });
drag = updateDrag(drag, { x: 240, y: 100, z: 0.7 }, 'open', { zones });
assert.deepEqual(drag.dropEvent, { objectId: 'acid', targetZone: 'beaker_zone' });

let fistDrag = createDragState(objects);
fistDrag = updateDrag(fistDrag, { x: 100, y: 100, z: 0.7 }, 'fist', { zones });
assert.equal(fistDrag.holdingObjectId, null);

const clicks = [];
const clickController = createPinchClickController();
clickController.update('open', {
  resolveObjectId: () => 'acid',
  onObjectClick: (objectId) => clicks.push(objectId),
});
clickController.update('pinch', {
  resolveObjectId: () => 'acid',
  onObjectClick: (objectId) => clicks.push(objectId),
});
clickController.update('pinch', {
  resolveObjectId: () => 'acid',
  onObjectClick: (objectId) => clicks.push(objectId),
});
assert.deepEqual(clicks, ['acid']);

const input = createInputState({
  detected: true,
  rawGesture: 'pinch',
  stableGesture: 'pinch',
  cursorScene: { x: 120, y: 130, z: 0.7 },
  mode: 'gesture',
});
assert.equal(input.isHoldingGesture, true);
assert.equal(input.cursorScene.x, 120);

console.log('interface contract tests passed');
