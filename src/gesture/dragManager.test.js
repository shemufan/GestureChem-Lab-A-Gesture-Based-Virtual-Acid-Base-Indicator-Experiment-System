import assert from 'node:assert/strict';
import { buildObjects, buildZones } from '../constants/labConfig.js';
import { createDragState, updateDrag } from './dragManager.js';

const objects = [
  { id: 'acid', label: 'Acid', x: 100, y: 100, z: 0.25, width: 80, height: 80 },
];
const zones = [
  { id: 'beaker_zone', x: 220, y: 220, z: 0.55, width: 100, height: 100, depthRange: [0.35, 0.85] },
];

let state = createDragState(objects);

state = updateDrag(state, { x: 102, y: 98 }, 'pinch', { zones, grabRadius: 80 });
assert.equal(state.holdingObjectId, 'acid');
assert.equal(state.hoveredObjectId, 'acid');

state = createDragState(objects);
state = updateDrag(state, { x: 102, y: 98 }, 'fist', { zones, grabRadius: 80 });
assert.equal(state.holdingObjectId, null);

state = createDragState(objects);
state = updateDrag(state, { x: 102, y: 98, z: 0.95 }, 'pinch', {
  zones,
  grabRadius: 80,
  grabDepthRange: 0.25,
});
assert.equal(state.holdingObjectId, null);

state = updateDrag(state, { x: 102, y: 98, z: 0.3 }, 'pinch', {
  zones,
  grabRadius: 80,
  grabDepthRange: 0.25,
});
assert.equal(state.holdingObjectId, 'acid');

state = createDragState(objects);
state = updateDrag(state, { x: 102, y: 98, z: 0.63 }, 'pinch', {
  zones,
  grabRadius: 80,
});
assert.equal(state.holdingObjectId, 'acid');

state = updateDrag(state, { x: 220, y: 220, z: 0.6 }, 'pinch', { zones, grabRadius: 80 });
assert.equal(state.objects.find((object) => object.id === 'acid').x, 220);
assert.equal(state.objects.find((object) => object.id === 'acid').z, 0.6);
assert.equal(state.nearZoneId, 'beaker_zone');

state = updateDrag(state, { x: 220, y: 220, z: 0.6 }, 'open', { zones, grabRadius: 80 });
assert.equal(state.holdingObjectId, null);
assert.deepEqual(state.dropEvent, { objectId: 'acid', targetZone: 'beaker_zone' });

state = createDragState(objects);
state = updateDrag(state, { x: 102, y: 98, z: 0.3 }, 'pinch', {
  zones,
  grabRadius: 80,
  grabDepthRange: 0.25,
});
state = updateDrag(state, { x: 220, y: 220, z: 0.1 }, 'pinch', { zones, grabRadius: 80 });
state = updateDrag(state, { x: 220, y: 220, z: 0.1 }, 'open', {
  zones,
  grabRadius: 80,
  releaseGraceMs: 0,
});
assert.deepEqual(state.dropEvent, { objectId: 'acid', targetZone: 'table' });

const nearbyObjects = [
  { id: 'acid', label: 'Acid', x: 100, y: 100, z: 0.5, width: 80, height: 80 },
  { id: 'base', label: 'Base', x: 128, y: 100, z: 0.5, width: 80, height: 80 },
];
state = updateDrag(createDragState(nearbyObjects), { x: 122, y: 100, z: 0.5 }, 'pinch', {
  zones,
  grabRadius: 80,
  grabDepthRange: 0.4,
});
assert.equal(state.nearestObjectId, 'base');
assert.equal(state.holdingObjectId, 'base');
assert.equal(state.isInsideGrabZone, true);
assert.equal(typeof state.nearestDistance, 'number');

state = createDragState(objects);
state = updateDrag(state, { x: 102, y: 98, z: 0.3 }, 'pinch', {
  zones,
  grabRadius: 80,
  grabDepthRange: 0.25,
  now: 1000,
});
assert.equal(state.holdingObjectId, 'acid');
state = updateDrag(state, { x: 108, y: 104, z: 0.32 }, 'open', {
  zones,
  releaseGraceMs: 180,
  now: 1050,
});
assert.equal(state.holdingObjectId, 'acid');
assert.equal(state.dropEvent, null);
assert.equal(state.dropReason, 'release_grace');
state = updateDrag(state, { x: 108, y: 104, z: 0.32 }, 'open', {
  zones,
  releaseGraceMs: 180,
  now: 1240,
});
assert.equal(state.holdingObjectId, null);
assert.deepEqual(state.dropEvent, { objectId: 'acid', targetZone: 'table' });

const labObjects = buildObjects({ width: 1000, height: 650 });
const labZones = buildZones({ width: 1000, height: 650 });
for (const object of labObjects) {
  const nearCameraState = updateDrag(
    createDragState(labObjects),
    { x: object.x, y: object.y, z: 0.98 },
    'pinch',
    {
      zones: labZones,
      grabRadius: 78,
      grabDepthRange: 0.78,
      grabZRange: [0.25, 1],
    },
  );
  assert.equal(nearCameraState.holdingObjectId, object.id);
}

let gogglesState = createDragState(labObjects);
const goggles = labObjects.find((object) => object.id === 'goggles');
const faceZone = labZones.find((zone) => zone.id === 'face_area');
gogglesState = updateDrag(
  gogglesState,
  { x: goggles.x, y: goggles.y, z: 0.92 },
  'pinch',
  {
    zones: labZones,
    grabRadius: 78,
    grabDepthRange: 0.78,
    grabZRange: [0.25, 1],
  },
);
gogglesState = updateDrag(gogglesState, { x: faceZone.x, y: faceZone.y, z: 0.92 }, 'pinch', {
  zones: labZones,
  grabRadius: 78,
});
gogglesState = updateDrag(gogglesState, { x: faceZone.x, y: faceZone.y, z: 0.92 }, 'open', {
  zones: labZones,
  grabRadius: 78,
});
assert.deepEqual(gogglesState.dropEvent, { objectId: 'goggles', targetZone: 'face_area' });

const beakerZone = labZones.find((zone) => zone.id === 'beaker_zone');
for (const reagentId of ['acid', 'indicator', 'base']) {
  let reagentState = createDragState(labObjects);
  const reagent = labObjects.find((object) => object.id === reagentId);
  reagentState = updateDrag(
    reagentState,
    { x: reagent.x, y: reagent.y, z: 0.92 },
    'pinch',
    {
      zones: labZones,
      grabRadius: 78,
      grabDepthRange: 0.78,
      grabZRange: [0.25, 1],
    },
  );
  reagentState = updateDrag(reagentState, { x: beakerZone.x, y: beakerZone.y, z: 0.92 }, 'pinch', {
    zones: labZones,
    grabRadius: 78,
  });
  reagentState = updateDrag(reagentState, { x: beakerZone.x, y: beakerZone.y, z: 0.92 }, 'open', {
    zones: labZones,
    grabRadius: 78,
  });
  assert.deepEqual(reagentState.dropEvent, { objectId: reagentId, targetZone: 'beaker_zone' });
}

let graceState = createDragState(labObjects);
const indicator = labObjects.find((object) => object.id === 'indicator');
graceState = updateDrag(
  graceState,
  { x: indicator.x, y: indicator.y, z: 0.8 },
  'pinch',
  {
    zones: labZones,
    grabRadius: 78,
    grabDepthRange: 0.78,
    grabZRange: [0.25, 1],
    now: 2000,
  },
);
graceState = updateDrag(graceState, { x: beakerZone.x + 120, y: beakerZone.y, z: 0.8 }, 'pinch', {
  zones: labZones,
  snapDistance: 150,
  now: 2050,
});
assert.equal(graceState.snapZoneId, 'beaker_zone');
assert.equal(graceState.nearZoneId, 'beaker_zone');
assert.equal(graceState.isInsideReactionZone, true);
assert.equal(graceState.lastValidDropZoneId, 'beaker_zone');
graceState = updateDrag(graceState, { x: beakerZone.x + 320, y: beakerZone.y + 240, z: 0.8 }, 'pinch', {
  zones: labZones,
  snapDistance: 150,
  now: 2100,
});
graceState = updateDrag(graceState, { x: beakerZone.x + 320, y: beakerZone.y + 240, z: 0.8 }, 'open', {
  zones: labZones,
  releaseGraceMs: 220,
  now: 2140,
});
assert.deepEqual(graceState.dropEvent, { objectId: 'indicator', targetZone: 'beaker_zone' });
assert.equal(graceState.dropReason, 'grace_zone');

console.log('dragManager tests passed');
