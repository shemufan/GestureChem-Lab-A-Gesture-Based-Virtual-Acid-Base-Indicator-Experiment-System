import assert from 'node:assert/strict';
import { buildObjects } from '../constants/labConfig.js';
import { createPinchClickController, findObjectAtPoint } from './pinchClickController.js';

const labObjects = buildObjects({ width: 1000, height: 650 });

for (const object of labObjects) {
  const point = object.id === 'beaker'
    ? { x: object.x, y: object.y + object.height * 0.42 }
    : { x: object.x, y: object.y };
  assert.equal(findObjectAtPoint(point, labObjects), object.id);
}

const acid = labObjects.find((object) => object.id === 'acid');
const indicator = labObjects.find((object) => object.id === 'indicator');
const betweenReagents = {
  x: (acid.x + indicator.x) / 2,
  y: acid.y,
};
assert.equal(findObjectAtPoint(betweenReagents, labObjects), null);

const controller = createPinchClickController();
const events = [];
const clickOptions = {
  resolveObjectId: () => 'acid',
  onObjectClick: (objectId) => events.push(objectId),
};

assert.equal(controller.update('open', clickOptions), null);
assert.equal(controller.update('pinch', clickOptions), 'acid');
assert.deepEqual(events, ['acid']);
assert.equal(controller.update('pinch', clickOptions), null);
assert.deepEqual(events, ['acid']);
assert.equal(controller.update('fist', clickOptions), null);
assert.deepEqual(events, ['acid']);
assert.equal(controller.update('open', clickOptions), null);
assert.equal(controller.update('pinch', clickOptions), 'acid');
assert.deepEqual(events, ['acid', 'acid']);

const missedController = createPinchClickController();
assert.equal(missedController.update('pinch', {
  resolveObjectId: () => null,
  onObjectClick: (objectId) => events.push(objectId),
}), null);

console.log('pinchClickController tests passed');
