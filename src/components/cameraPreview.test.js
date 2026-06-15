import assert from 'node:assert/strict';
import { shouldDrawPreviewFrame } from './cameraPreview.js';

assert.equal(shouldDrawPreviewFrame({ readyState: 2, videoWidth: 640, videoHeight: 480 }), true);
assert.equal(shouldDrawPreviewFrame({ readyState: 1, videoWidth: 640, videoHeight: 480 }), false);
assert.equal(shouldDrawPreviewFrame({ readyState: 2, videoWidth: 0, videoHeight: 480 }), false);

console.log('cameraPreview tests passed');
