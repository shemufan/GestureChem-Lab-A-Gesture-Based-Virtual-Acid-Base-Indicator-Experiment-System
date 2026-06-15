import assert from 'node:assert/strict';
import {
  getClickDropTarget,
  resolveDropZoneAtPoint,
  toScenePoint,
} from './appInteraction.js';

assert.equal(getClickDropTarget('goggles'), 'face_area');
assert.equal(getClickDropTarget('acid_bottle'), 'beaker_zone');
assert.equal(getClickDropTarget('indicator_bottle'), 'beaker_zone');
assert.equal(getClickDropTarget('base_bottle'), 'beaker_zone');
assert.equal(getClickDropTarget('beaker'), 'beaker_zone');

const zones = [
  { id: 'face_area', x: 100, y: 80, width: 100, height: 80 },
  { id: 'beaker_zone', x: 250, y: 180, width: 120, height: 100 },
];

assert.equal(resolveDropZoneAtPoint({ x: 250, y: 180 }, zones), 'beaker_zone');
assert.equal(resolveDropZoneAtPoint({ x: 100, y: 80 }, zones), 'face_area');
assert.equal(resolveDropZoneAtPoint({ x: 10, y: 10 }, zones), 'table');

assert.deepEqual(
  toScenePoint({ clientX: 150, clientY: 190 }, { left: 50, top: 40 }, 0.6),
  { x: 100, y: 150, z: 0.6 },
);

console.log('appInteraction tests passed');
