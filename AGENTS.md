# GestureChem Lab Project Context

GestureChem Lab is an HCI final project: a gesture-based virtual acid-base indicator experiment system.

## Project Goal

Build a stable web-based prototype where beginner students can complete a virtual phenolphthalein acid-base indicator experiment using hand gestures and mouse fallback.

This is not a full chemical simulation engine. The focus is HCI interaction design:
- gesture-based object manipulation
- mouse fallback for all core actions
- step-by-step guidance
- safety feedback
- error tolerance
- learning feedback
- demo stability

## Development Environment

All work must be done inside the conda virtual environment `hci_env`. This includes:
- Installing npm/pip dependencies
- Running the dev server
- Running scripts and tests

On this Windows workspace, prefer:

```bash
cmd /c "conda activate hci_env && npm test"
cmd /c "conda activate hci_env && npm run build"
cmd /c "conda activate hci_env && npm run dev"
```

## Tech Stack

- React + Vite
- JavaScript
- React Three Fiber / Three.js virtual lab interface
- Webcam hand tracking
- MediaPipe Tasks Vision HandLandmarker
- CSS and inline React styles for UI and animation
- Mouse fallback required

## UI Direction

- The current UI base is the teammate's `main` branch R3F/Three.js lab scene.
- Preserve the 3D lab scene design unless the user explicitly asks for a redesign.
- Do not replace it with the older 2D virtual lab UI.
- Gesture work should be added on top of the existing 3D scene through lightweight overlays, camera preview, cursor feedback, and drop zones.
- Demo stability is more important than visual complexity.

## Core Experiment Steps

1. Wear goggles
2. Add acid solution into beaker
3. Add phenolphthalein indicator
4. Add base solution
5. Observe color change to pink
6. Dispose waste liquid

## Object IDs

- goggles
- acid
- indicator
- base
- beaker

Legacy UI IDs may be accepted through an adapter only:
- acid_bottle -> acid
- indicator_bottle -> indicator
- base_bottle -> base

## Zone IDs

- face_area
- beaker_zone
- waste_bin
- table

Legacy UI zones may be accepted through an adapter only:
- user_head -> face_area
- beaker -> beaker_zone

## Important Event Interface

Gesture and mouse drag modules must output:

```js
onObjectDrop(objectId, targetZone)
```

The gesture/mouse module detects what the user did.
The experiment workflow module decides whether the action is correct.

## Development Rules

- Do not create backend, database, login, or unrelated 3D features.
- Keep modules separated:
  - camera
  - gesture recognition
  - gesture controller
  - drag manager
  - experiment workflow
  - UI feedback
- Keep demo stability higher priority than feature complexity.
- Always preserve mouse fallback.
- Do not rename object IDs or zone IDs without asking.
- Before major changes, explain what files will be modified.
- After changes, explain how to test.
- Avoid large rewrites unless necessary.
