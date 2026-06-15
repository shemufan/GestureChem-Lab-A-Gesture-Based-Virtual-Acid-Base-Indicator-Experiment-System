import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getClickDropTarget, toScenePoint } from './appInteraction.js';
import CameraView from './components/CameraView';
import LabScene from './components/LabScene';
import ResultPanel from './components/ResultPanel';
import SafetyPanel from './components/SafetyPanel';
import VirtualExperimentHand from './components/VirtualExperimentHand';
import { buildObjects, buildZones, getGestureLabel } from './constants/labConfig.js';
import { INTERACTION_CONFIG } from './constants/interactionConfig.js';
import { EXPERIMENT_STEPS, INITIAL_STATE } from './experiment/experimentSteps';
import { processAction } from './experiment/workflowEngine';
import { createDragState, updateDrag } from './gesture/dragManager.js';
import { detectGesture, createGestureStabilizer } from './gesture/gestureController.js';
import { initRecognizer, startLoop, stopLoop, closeRecognizer } from './gesture/gestureRecognizer.js';
import { createPinchClickController, findObjectAtPoint } from './gesture/pinchClickController.js';
import { useVirtualHand3D } from './hooks/useVirtualHand3D.js';

function App() {
  const sceneRef = useRef(null);
  const dragRef = useRef(createDragState(buildObjects()));
  const zonesRef = useRef(buildZones());
  const pendingMouseDragRef = useRef(null);
  const mouseDraggingRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const pinchClickRef = useRef(createPinchClickController());
  const pointerWorldRef = useRef(null);
  const stabilizerRef = useRef(createGestureStabilizer({
    enterFrames: { pinch: 3, open: 2 },
    releaseFrames: 2,
  }));
  const mapVirtualHand = useVirtualHand3D();

  const [state, setState] = useState(INITIAL_STATE);
  const [showSafety, setShowSafety] = useState(false);
  const [showResultDelay, setShowResultDelay] = useState(false);
  const [dragState, setDragState] = useState(dragRef.current);
  const [zones, setZones] = useState(zonesRef.current);
  const [sceneSize, setSceneSize] = useState({ width: 1000, height: 650 });
  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [gesture, setGesture] = useState('none');
  const [rawGesture, setRawGesture] = useState('none');
  const [sceneCursor, setSceneCursor] = useState({ x: 0, y: 0, z: 0 });
  const [interactionMode, setInteractionMode] = useState('mouse');

  useEffect(() => {
    if (state.isCompleted) {
      const timer = setTimeout(() => setShowResultDelay(true), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.isCompleted]);

  const syncSceneLayout = useCallback((resetObjects = false) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;

    setSceneSize({ width: rect.width, height: rect.height });
    const nextZones = buildZones(rect);
    zonesRef.current = nextZones;
    setZones(nextZones);

    if (resetObjects) {
      const nextDrag = createDragState(buildObjects(rect));
      dragRef.current = nextDrag;
      setDragState(nextDrag);
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => syncSceneLayout(true));
    const handleResize = () => syncSceneLayout(true);
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', handleResize);
    };
  }, [syncSceneLayout]);

  const onObjectDrop = useCallback((objectId, targetZone) => {
    setState((current) => {
      if (current.isCompleted) return current;
      const nextState = processAction(current, { objectId, zoneId: targetZone });
      if (nextState.error) setShowSafety(true);
      return nextState;
    });
  }, []);

  const applyDrag = useCallback((cursor, gestureType) => {
    const cursorWithWorld = {
      ...cursor,
      worldPosition: pointerWorldRef.current
        ? [
            pointerWorldRef.current.x,
            pointerWorldRef.current.y + 0.55,
            pointerWorldRef.current.z,
          ]
        : null,
    };

    const nextDrag = updateDrag(dragRef.current, cursorWithWorld, gestureType, {
      zones: zonesRef.current,
      reactionZoneIds: INTERACTION_CONFIG.reactionZoneIds,
      snapZoneIds: INTERACTION_CONFIG.snapZoneIds,
    });

    dragRef.current = nextDrag;
    setDragState(nextDrag);

    if (nextDrag.dropEvent) {
      onObjectDrop(nextDrag.dropEvent.objectId, nextDrag.dropEvent.targetZone);
    }
  }, [onObjectDrop]);

  const handleObjectClick = useCallback((objectId) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    onObjectDrop(objectId, getClickDropTarget(objectId));
  }, [onObjectDrop]);

  const handlePointerWorldPoint = useCallback((worldPoint) => {
    pointerWorldRef.current = worldPoint;
  }, []);

  const applyGestureClick = useCallback((cursor, gestureType) => {
    const hoveredObjectId = gestureType === 'none'
      ? null
      : findObjectAtPoint(cursor, dragRef.current.objects);
    const nextDrag = {
      ...dragRef.current,
      holdingObjectId: null,
      hoveredObjectId,
      nearestObjectId: hoveredObjectId,
      nearestDistance: null,
      nearZoneId: null,
      snapZoneId: null,
      lastValidDropZoneId: null,
      lastValidDropZoneAt: null,
      isInsideGrabZone: Boolean(hoveredObjectId),
      isInsideReactionZone: false,
      dropReason: null,
      dropEvent: null,
      releaseStartedAt: null,
    };

    dragRef.current = nextDrag;
    setDragState(nextDrag);

    pinchClickRef.current.update(gestureType, {
      resolveObjectId: () => hoveredObjectId,
      onObjectClick: (objectId) => onObjectDrop(objectId, getClickDropTarget(objectId)),
    });
  }, [onObjectDrop]);

  const handleObjectPointerDown = useCallback((objectId, event) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = toScenePoint(event, rect);
    pendingMouseDragRef.current = { objectId, startPoint: point, lastPoint: point };
    setInteractionMode('mouse');
  }, []);

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
        applyDrag(pending.startPoint, 'pinch');
      }

      if (mouseDraggingRef.current) {
        setSceneCursor(point);
        applyDrag(point, 'pinch');
      }
    };

    const handleMouseUp = () => {
      const pending = pendingMouseDragRef.current;
      if (pending && mouseDraggingRef.current) {
        applyDrag(pending.lastPoint, 'open');
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
  }, [applyDrag]);

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

  // 关键：手势模式下走拖拽，而不是点击
  if (!mouseDraggingRef.current && result.detected) {
    applyDrag(virtualHand.cursorScene, stableGesture);
  }

  // 没检测到手时，如果当前正在抓取，可以给一次释放信号
  if (!result.detected && dragRef.current.holdingObjectId) {
    applyDrag(dragRef.current.objects.find(o => o.id === dragRef.current.holdingObjectId), 'open');
  }
});
      } catch (error) {
        console.error('Failed to initialize MediaPipe:', error);
        setModelReady(false);
      }
    })();
  }, [applyDrag, mapVirtualHand]);

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

  const currentStep = EXPERIMENT_STEPS[state.currentStepIndex];
  const showDropZones = Boolean(dragState.holdingObjectId);

  return (
    <div style={uiStyles.app}>
      <LabScene
        ref={sceneRef}
        currentStep={currentStep}
        beakerColor={state.beakerLiquidColor}
        objects={dragState.objects}
        sceneSize={sceneSize}
        sceneCursor={sceneCursor}
        holdingObjectId={dragState.holdingObjectId}
        hoveredObjectId={dragState.hoveredObjectId}
        nearZoneId={dragState.nearZoneId}
        onObjectClick={handleObjectClick}
        onObjectPointerDown={handleObjectPointerDown}
        onPointerWorldPoint={handlePointerWorldPoint}
      />

      {showDropZones && zones.map((zone) => (
        <div
          key={zone.id}
          style={{
            ...uiStyles.dropZone,
            left: zone.x - zone.width / 2,
            top: zone.y - zone.height / 2,
            width: zone.width,
            height: zone.height,
            borderColor: dragState.nearZoneId === zone.id ? '#2ecc71' : 'rgba(52, 152, 219, 0.55)',
          }}
        >
          {zone.sceneLabel}
        </div>
      ))}

      {(handDetected || dragState.holdingObjectId) && (
        <VirtualExperimentHand
          visible={handDetected || Boolean(dragState.holdingObjectId)}
          x={sceneCursor.x}
          y={sceneCursor.y}
          gesture={gesture}
          holdingObjectId={dragState.holdingObjectId}
        />
      )}

      {!state.isCompleted && currentStep && (
        <div style={uiStyles.stepPanel}>
          <div style={uiStyles.stepEyebrow}>当前目标</div>
          <div style={uiStyles.stepText}>{currentStep.instruction}</div>
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
  gestureMeta: {
    display: 'grid',
    gap: '4px',
    color: '#334155',
    fontSize: '12px',
    minWidth: '150px',
  },
  cursor: {
    position: 'absolute',
    width: '22px',
    height: '22px',
    marginLeft: '-11px',
    marginTop: '-11px',
    borderRadius: '50%',
    border: '2px solid #0f172a',
    background: 'rgba(46, 204, 113, 0.45)',
    boxShadow: '0 0 0 8px rgba(46, 204, 113, 0.12)',
    pointerEvents: 'none',
    zIndex: 5,
  },
  dropZone: {
    position: 'absolute',
    zIndex: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed',
    borderRadius: '14px',
    color: '#1e293b',
    background: 'rgba(255, 255, 255, 0.22)',
    fontSize: '13px',
    fontWeight: 700,
    pointerEvents: 'none',
  },
};

export default App;
