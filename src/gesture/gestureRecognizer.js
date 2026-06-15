/**
 * Gesture Recognizer — MediaPipe Hand Landmarker wrapper.
 *
 * Responsibilities:
 *   - Load the MediaPipe HandLandmarker model
 *   - Run per-frame hand landmark detection on a <video> element
 *   - Extract all detected hands' landmarks + handedness
 *   - Convert the primary hand's index fingertip to video-space cursor pos
 *
 * Gesture classification is handled by gestureController.detectGesture().
 *
 * Output shape (passed to onResult callback each frame):
 *   {
 *     detected: boolean,
 *     cursorPos: { x: number, y: number },   // primary hand index tip (NORMALISED 0–1, NOT mirrored)
 *     hands: Array<{                          // all detected hands (up to 2)
 *       landmarks: Array<{x,y,z}>,            // 21 landmarks each (normalised 0–1)
 *       handedness: 'Left' | 'Right',
 *     }>,
 *   }
 */

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

let handLandmarker = null;
let animFrameId = null;
let running = false;
let lastVideoWidth = 0;
let lastVideoHeight = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the MediaPipe HandLandmarker (detects up to 2 hands).
 * @returns {Promise<void>}
 */
export async function initRecognizer() {
  if (handLandmarker) return;

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

/**
 * Start the per-frame hand-tracking loop.
 *
 * @param {HTMLVideoElement} videoElement
 * @param {Function} onResult — called each frame with a result object
 */
export function startLoop(videoElement, onResult) {
  if (running) return;

  lastVideoWidth = videoElement.videoWidth || videoElement.width;
  lastVideoHeight = videoElement.videoHeight || videoElement.height;

  running = true;

  const tick = () => {
    if (!running) return;

    if (handLandmarker && videoElement.readyState >= 2) {
      const timestamp = performance.now();
      const result = handLandmarker.detectForVideo(videoElement, timestamp);

      if (result.landmarks && result.landmarks.length > 0) {
        // Build hands array with handedness labels
        const hands = result.landmarks.map((lm, i) => ({
          landmarks: lm,
          handedness:
            result.handedness && result.handedness[i]
              ? result.handedness[i][0].categoryName
              : 'Unknown',
        }));

        // Primary hand = first detected; cursor from its index tip (landmark 8)
        // Output normalised coordinates (0–1); caller handles mirror + page mapping
        const primaryLm = result.landmarks[0];
        const indexTip = primaryLm[8];

        onResult({
          detected: true,
          cursorPos: { x: indexTip.x, y: indexTip.y },
          hands,
        });
      } else {
        onResult({
          detected: false,
          cursorPos: { x: 0, y: 0 },
          hands: [],
        });
      }
    } else {
      onResult({
        detected: false,
        cursorPos: { x: 0, y: 0 },
        hands: [],
      });
    }

    animFrameId = requestAnimationFrame(tick);
  };

  animFrameId = requestAnimationFrame(tick);
}

/**
 * Stop the tracking loop.
 */
export function stopLoop() {
  running = false;
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

/**
 * Release the MediaPipe model.
 */
export function closeRecognizer() {
  stopLoop();
  if (handLandmarker) {
    handLandmarker.close();
    handLandmarker = null;
  }
}
