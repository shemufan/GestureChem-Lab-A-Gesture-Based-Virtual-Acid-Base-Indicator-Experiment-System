import assert from 'node:assert/strict';
import { EXPERIMENT_STEPS, INITIAL_STATE } from './experimentSteps.js';
import { normalizeDropAction, processAction } from './workflowEngine.js';

assert.equal(EXPERIMENT_STEPS.length, 6);
assert.deepEqual(
  EXPERIMENT_STEPS.map((step) => [step.targetObject, step.targetZone]),
  [
    ['goggles', 'face_area'],
    ['acid', 'beaker_zone'],
    ['indicator', 'beaker_zone'],
    ['base', 'beaker_zone'],
    ['beaker', 'beaker_zone'],
    ['beaker', 'waste_bin'],
  ],
);

assert.deepEqual(normalizeDropAction('acid_bottle', 'beaker'), {
  objectId: 'acid',
  zoneId: 'beaker_zone',
});
assert.deepEqual(normalizeDropAction('goggles', 'user_head'), {
  objectId: 'goggles',
  zoneId: 'face_area',
});

let state = INITIAL_STATE;
for (const [objectId, zoneId] of [
  ['goggles', 'face_area'],
  ['acid', 'beaker_zone'],
  ['indicator', 'beaker_zone'],
  ['base', 'beaker_zone'],
  ['beaker', 'beaker_zone'],
  ['beaker', 'waste_bin'],
]) {
  state = processAction(state, { objectId, zoneId });
  assert.equal(state.error, null);
}

assert.equal(state.isCompleted, true);
assert.equal(state.currentStepIndex, EXPERIMENT_STEPS.length - 1);
assert.equal(state.beakerLiquidColor, '#f0f0f0');

let compatibleState = INITIAL_STATE;
for (const [objectId, zoneId] of [
  ['goggles', 'user_head'],
  ['acid_bottle', 'beaker'],
  ['indicator_bottle', 'beaker'],
  ['base_bottle', 'beaker'],
  ['beaker', 'beaker'],
  ['beaker', 'waste_bin'],
]) {
  compatibleState = processAction(compatibleState, { objectId, zoneId });
}

assert.equal(compatibleState.isCompleted, true);
assert.equal(compatibleState.error, null);

const unsafeState = processAction(INITIAL_STATE, {
  objectId: 'acid',
  zoneId: 'beaker_zone',
});
assert.match(unsafeState.error, /护目镜|安全/);
assert.equal(unsafeState.currentStepIndex, 0);

console.log('workflowEngine tests passed');
