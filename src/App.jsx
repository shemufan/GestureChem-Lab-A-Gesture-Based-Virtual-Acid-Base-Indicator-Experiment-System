import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toScenePoint } from './appInteraction.js';
import CameraView from './components/CameraView';
import LabScene from './components/LabScene';
import ResultPanel from './components/ResultPanel';
import SafetyPanel from './components/SafetyPanel';
import VirtualExperimentHand from './components/VirtualExperimentHand';
import { getGestureLabel } from './constants/labConfig.js';
import { EXPERIMENT_STEPS, INITIAL_STATE } from './experiment/experimentSteps';
import { processAction } from './experiment/workflowEngine';
import { createDrag3DState, updateDrag3D, resetDroppedObjectIfNeeded } from './gesture/drag3dManager.js';
import { detectGesture, createGestureStabilizer } from './gesture/gestureController.js';
import { initRecognizer, startLoop, stopLoop, closeRecognizer } from './gesture/gestureRecognizer.js';
import { useVirtualHand3D } from './hooks/useVirtualHand3D.js';

function App() {
  const sceneRef = useRef(null);
  const pendingMouseDragRef = useRef(null);
  const mouseDraggingRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const stabilizerRef = useRef(createGestureStabilizer({
    enterFrames: { pinch: 3, open: 2 },
    releaseFrames: 2,
  }));
  const mapVirtualHand = useVirtualHand3D();

  // ── 3D drag state ──────────────────────────────────────────────────────
  const drag3dRef = useRef(createDrag3DState());
  const [drag3dState, setDrag3dState] = useState(drag3dRef.current);
  const pointer3DRef = useRef({
    hoveredObjectId: null,
    dragPoint: null,
  });

  // ── Experiment state ───────────────────────────────────────────────────
  const [state, setState] = useState(INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [showSafety, setShowSafety] = useState(false);
  const [showResultDelay, setShowResultDelay] = useState(false);
  const [sceneSize, setSceneSize] = useState({ width: 1000, height: 650 });
  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [gesture, setGesture] = useState('none');
  const [rawGesture, setRawGesture] = useState('none');
  const [sceneCursor, setSceneCursor] = useState({ x: 0, y: 0, z: 0 });
  const [interactionMode, setInteractionMode] = useState('mouse');

  // ── Completion timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (state.isCompleted) {
      const timer = setTimeout(() => setShowResultDelay(true), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.isCompleted]);

  // ── Scene layout sync ──────────────────────────────────────────────────
  const syncSceneLayout = useCallback(() => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSceneSize({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => syncSceneLayout());
    const handleResize = () => syncSceneLayout();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', handleResize);
    };
  }, [syncSceneLayout]);

  // ── Drop handler ───────────────────────────────────────────────────────
  const onObjectDrop = useCallback((objectId, targetZone) => {
    setState((current) => {
      if (current.isCompleted) return current;
      const nextState = processAction(current, { objectId, zoneId: targetZone });
      if (nextState.error) setShowSafety(true);
      return nextState;
    });

    // Reset dropped object back to its resting position
    setDrag3dState((current) => resetDroppedObjectIfNeeded(current, objectId));
  }, []);

  // ── 3D drag apply ─────────────────────────────────────────────────────
  const applyDrag3D = useCallback((gestureType, forcedHoveredObjectId = null) => {
    setDrag3dState((current) => {
      const next = updateDrag3D(current, {
        gesture: gestureType,
        hoveredObjectId: forcedHoveredObjectId || pointer3DRef.current.hoveredObjectId,
        dragPoint: pointer3DRef.current.dragPoint,
      });

      if (next.dropEvent) {
        // Persist via ref so we always have latest state
        drag3dRef.current = next;
        onObjectDrop(next.dropEvent.objectId, next.dropEvent.targetZone);
        return { ...next, dropEvent: null };
      }

      drag3dRef.current = next;
      return next;
    });
  }, [onObjectDrop]);

  // ── Mouse click handler ────────────────────────────────────────────────
  // Clicks are intentionally suppressed for most action types.
  // Only OBSERVE steps (e.g. observing beaker colour) still respond to a
  // simple click. All other steps (EQUIP / POUR / DROP / DISPOSE) must go
  // through the 3D drag pipeline.
  const handleObjectClick = useCallback((objectId) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    const currentState = stateRef.current;
    const currentStep = EXPERIMENT_STEPS[currentState.currentStepIndex];
    if (
      currentStep?.actionType === 'OBSERVE'
      && objectId === currentStep.targetObject
    ) {
      onObjectDrop(objectId, currentStep.targetZone);
    }
    // All other clicks are intentionally ignored — drag only.
  }, [onObjectDrop]);

  // ── 3D pointer callback from ScenePointerController ────────────────────
  const handlePointer3D = useCallback((payload) => {
    pointer3DRef.current = payload;
  }, []);

  // ── Mouse pointer-down (starts drag tracking) ──────────────────────────
  const handleObjectPointerDown = useCallback((objectId, event) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = toScenePoint(event, rect);
    pendingMouseDragRef.current = { objectId, startPoint: point, lastPoint: point };
    setInteractionMode('mouse');
  }, []);

  // ── Mouse move / up for drag ───────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (event) => {
      const pending = pendingMouseDragRef.current;
      if (!pending) return;

      const rect = sceneRef.current?.getBoundingClientRect();
      if (!rect) return;
      const point = toScenePoint(event, rect);
      pending.lastPoint = point;

      const dx = point.x - pending.startPoint.x;
      const dy = point.y - pending.startPoint.y;
      const moved = Math.sqrt(dx * dx + dy * dy);
      if (!mouseDraggingRef.current && moved > 6) {
        mouseDraggingRef.current = true;
        suppressNextClickRef.current = true;
        // Lock to the object the user originally pressed, not whatever the
        // raycaster is hovering over now.
        applyDrag3D('pinch', pending.objectId);
      }

      if (mouseDraggingRef.current) {
        setSceneCursor(point);
        applyDrag3D('pinch');
      }
    };

    const handleMouseUp = () => {
      const pending = pendingMouseDragRef.current;
      if (pending && mouseDraggingRef.current) {
        applyDrag3D('open');
      }
      pendingMouseDragRef.current = null;
      mouseDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [applyDrag3D]);

  // ── Camera / gesture pipeline ──────────────────────────────────────────
  const handleVideoReady = useCallback((videoEl) => {
    (async () => {
      try {
        await initRecognizer();
        setModelReady(true);

        startLoop(videoEl, (result) => {
          const primaryHand = result.hands.length > 0 ? result.hands[0] : null;
          const nextRawGesture = detectGesture(primaryHand ? primaryHand.landmarks : null);
          const stableGesture = stabilizerRef.current.update(nextRawGesture);
          const virtualHand = mapVirtualHand(result, primaryHand, sceneRef.current);

          setHandDetected(result.detected);
          setRawGesture(nextRawGesture);
          setGesture(stableGesture);
          setSceneCursor(virtualHand.cursorScene);

          if (result.detected && nextRawGesture !== 'none') {
            setInteractionMode('gesture');
          }

          // Gesture mode: 3D drag pipeline
          if (!mouseDraggingRef.current) {
            applyDrag3D(result.detected ? stableGesture : 'open');
          }
        });
      } catch (error) {
        console.error('Failed to initialize MediaPipe:', error);
        setModelReady(false);
      }
    })();
  }, [applyDrag3D, mapVirtualHand]);

  const handleStreamReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  const handleCameraError = useCallback(() => {
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopLoop();
      closeRecognizer();
    };
  }, []);

  // ── Current experiment step ────────────────────────────────────────────
  const currentStep = EXPERIMENT_STEPS[state.currentStepIndex];
  const draggingId = drag3dState.draggingObjectId;
  const nearZoneId = drag3dState.nearZoneId;
  const releaseHint = getReleaseHint(draggingId, nearZoneId);

  return (
    <div style={uiStyles.app}>
      <LabScene
        ref={sceneRef}
        currentStep={currentStep}
        beakerColor={state.beakerLiquidColor}
        drag3dState={drag3dState}
        sceneSize={sceneSize}
        sceneCursor={sceneCursor}
        onPointer3D={handlePointer3D}
        onObjectClick={handleObjectClick}
        onObjectPointerDown={handleObjectPointerDown}
        hasGoggles={state.hasGoggles}
      />

      {(handDetected || draggingId) && (
        <VirtualExperimentHand
          visible={handDetected || Boolean(draggingId)}
          x={sceneCursor.x}
          y={sceneCursor.y}
          gesture={gesture}
          holdingObjectId={draggingId}
        />
      )}

      {!state.isCompleted && currentStep && (
        <div style={uiStyles.stepPanel}>
          <div style={uiStyles.stepEyebrow}>当前目标</div>
          <div style={uiStyles.stepText}>{currentStep.instruction}</div>
        </div>
      )}

      {releaseHint && (
        <div style={uiStyles.releaseHint}>
          {releaseHint}
        </div>
      )}

      {state.isCompleted && !showResultDelay && (
        <div style={uiStyles.successToast}>滴定与废液处理已完成！请观察最终记录...</div>
      )}

      <div style={uiStyles.gesturePanel}>
        <CameraView
          onStreamReady={handleStreamReady}
          onVideoReady={handleVideoReady}
          onError={handleCameraError}
        />
        <div style={uiStyles.gestureMeta}>
          <strong>{interactionMode === 'gesture' ? '手势模式' : '鼠标模式'}</strong>
          <span>摄像头：{cameraReady ? '已连接' : '未连接'}</span>
          <span>模型：{modelReady ? '已就绪' : '等待中'}</span>
          <span>手势：{getGestureLabel(gesture)} / {getGestureLabel(rawGesture)}</span>
          <span>抓取：{draggingId ? getObjectDisplayName(draggingId) : '无'}</span>
        </div>
      </div>

      <SafetyPanel
        visible={showSafety}
        message={state.error}
        onClose={() => setShowSafety(false)}
      />

      {showResultDelay && (
        <ResultPanel
          score={state.score}
          logs={state.logs}
          timeElapsed={60}
          onRestart={() => window.location.reload()}
        />
      )}
    </div>
  );
}

const OBJECT_DISPLAY_NAMES = {
  goggles: '护目镜',
  acid: 'HCl',
  indicator: '酚酞',
  base: 'NaOH',
  beaker: '烧杯',
};

function getObjectDisplayName(objectId) {
  return OBJECT_DISPLAY_NAMES[objectId] || objectId || '无';
}

function getReleaseHint(objectId, zoneId) {
  if (!objectId || !zoneId) return null;

  if (zoneId === 'beaker_zone') {
    if (objectId === 'acid') return '松手以将 HCl 倒入烧杯';
    if (objectId === 'indicator') return '松手以滴入酚酞';
    if (objectId === 'base') return '松手以加入 NaOH';
    if (objectId === 'beaker') return '松手以观察烧杯';
    return '松手以放入烧杯区域';
  }

  if (zoneId === 'face_area') {
    return '松手以佩戴护目镜';
  }

  if (zoneId === 'waste_bin') {
    return '松手以倒入废液槽';
  }

  return null;
}

const uiStyles = {
  app: {
    width: '100vw',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#fff',
  },
  stepPanel: {
    position: 'absolute',
    top: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255,255,255,0.95)',
    padding: '20px 50px',
    borderRadius: '15px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    border: '1px solid #eee',
    textAlign: 'center',
    maxWidth: 'min(720px, calc(100vw - 48px))',
    pointerEvents: 'none',
  },
  stepEyebrow: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
  },
  stepText: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  successToast: {
    position: 'absolute',
    bottom: '10%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#2ecc71',
    color: 'white',
    padding: '15px 30px',
    borderRadius: '50px',
    fontSize: '20px',
    fontWeight: 'bold',
    boxShadow: '0 10px 30px rgba(46,204,113,0.4)',
  },
  gesturePanel: {
    position: 'absolute',
    left: '20px',
    bottom: '20px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.88)',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    boxShadow: '0 14px 36px rgba(15, 23, 42, 0.14)',
  },
  releaseHint: {
    position: 'absolute',
    top: '112px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(46, 204, 113, 0.92)',
    color: '#fff',
    padding: '10px 22px',
    borderRadius: '999px',
    fontSize: '15px',
    fontWeight: 700,
    boxShadow: '0 12px 30px rgba(46, 204, 113, 0.28)',
    pointerEvents: 'none',
    zIndex: 20,
  },
  gestureMeta: {
    display: 'grid',
    gap: '4px',
    color: '#334155',
    fontSize: '12px',
    minWidth: '150px',
  },
};

export default App;
