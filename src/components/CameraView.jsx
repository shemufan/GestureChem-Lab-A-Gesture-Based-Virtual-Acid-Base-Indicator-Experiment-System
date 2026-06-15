import { useEffect, useRef, useState } from 'react';
import { isMostlyBlackFrame, listVideoDevices, startCamera } from '../gesture/camera.js';
import { shouldDrawPreviewFrame } from './cameraPreview.js';

const CAMERA_STARTING_TEXT = '\u6b63\u5728\u542f\u52a8\u6444\u50cf\u5934...';
const CAMERA_START_FAILED_TEXT = '\u6444\u50cf\u5934\u542f\u52a8\u5931\u8d25\uff0c\u53ef\u7ee7\u7eed\u4f7f\u7528\u9f20\u6807\u64cd\u4f5c\u3002';
const BLACK_FRAME_TEXT = '\u6444\u50cf\u5934\u5df2\u8fde\u63a5\uff0c\u4f46\u9884\u89c8\u6301\u7eed\u9ed1\u5c4f\u3002\u8bf7\u5207\u6362\u6444\u50cf\u5934\u3001\u5173\u95ed\u9690\u79c1\u906e\u6321\uff0c\u6216\u9000\u51fa\u5360\u7528\u6444\u50cf\u5934\u7684\u8f6f\u4ef6\u3002';
const TRACK_LOST_TEXT = '\u6444\u50cf\u5934\u89c6\u9891\u6d41\u5df2\u4e2d\u65ad\u3002\u8bf7\u5237\u65b0\u9875\u9762\u6216\u91cd\u65b0\u9009\u62e9\u6444\u50cf\u5934\u3002';
const DEVICE_LABEL_TEXT = '\u6444\u50cf\u5934';
const DEFAULT_DEVICE_TEXT = '\u9ed8\u8ba4\u6444\u50cf\u5934';

export default function CameraView({ onStreamReady, onVideoReady, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const monitorRef = useRef(null);
  const previewStopRef = useRef(null);
  const callbacksRef = useRef({ onStreamReady, onVideoReady, onError });
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  useEffect(() => {
    callbacksRef.current = { onStreamReady, onVideoReady, onError };
  }, [onError, onStreamReady, onVideoReady]);

  useEffect(() => {
    const video = videoRef.current;
    const previewCanvas = canvasRef.current;
    if (!video || !previewCanvas) return undefined;

    let cancelled = false;
    setStatus('loading');
    setErrorMessage('');

    const stopCurrentStream = () => {
      if (monitorRef.current !== null) {
        clearInterval(monitorRef.current);
        monitorRef.current = null;
      }
      if (previewStopRef.current !== null) {
        previewStopRef.current();
        previewStopRef.current = null;
      }
      streamRef.current?.stop();
      streamRef.current = null;
      clearPreview(previewCanvas);
    };

    (async () => {
      try {
        stopCurrentStream();
        const { stream, stop } = await startCamera(video, {
          width: 960,
          height: 540,
          deviceId: selectedDeviceId || undefined,
        });

        if (cancelled) {
          stop();
          return;
        }

        streamRef.current = { stream, stop };
        previewStopRef.current = startCanvasPreview(video, previewCanvas);
        setStatus('live');
        callbacksRef.current.onStreamReady?.(stream);
        callbacksRef.current.onVideoReady?.(video);
        monitorRef.current = startVideoHealthMonitor(video, stream, {
          onBlackFrame: () => {
            setStatus('black');
            setErrorMessage(BLACK_FRAME_TEXT);
            callbacksRef.current.onError?.({ type: 'BlackFrameError' });
          },
          onRecovered: () => {
            setStatus('live');
            setErrorMessage('');
            callbacksRef.current.onStreamReady?.(stream);
          },
          onTrackLost: () => {
            setStatus('error');
            setErrorMessage(TRACK_LOST_TEXT);
            callbacksRef.current.onError?.({ type: 'TrackEndedError' });
          },
        });

        const nextDevices = await listVideoDevices();
        if (!cancelled) setDevices(nextDevices);
      } catch (error) {
        if (cancelled) return;
        const nextDevices = await listVideoDevices().catch(() => []);
        if (!cancelled) setDevices(nextDevices);

        const isBlackFrame = error.type === 'BlackFrameError' || error.originalError?.name === 'BlackFrameError';
        setStatus(isBlackFrame ? 'black' : 'error');
        setErrorMessage(error.message || CAMERA_START_FAILED_TEXT);
        callbacksRef.current.onError?.(error);
      }
    })();

    return () => {
      cancelled = true;
      stopCurrentStream();
    };
  }, [selectedDeviceId]);

  const showOverlay = status !== 'live';
  const canChooseDevice = devices.length > 1;

  return (
    <div style={styles.wrapper}>
      <div style={styles.shell}>
        <canvas
          ref={canvasRef}
          width="320"
          height="200"
          style={{
            ...styles.previewCanvas,
            opacity: status === 'live' ? 1 : 0.35,
          }}
        />
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={styles.hiddenVideo}
        />
        {showOverlay && (
          <div style={styles.status}>
            {status === 'loading' ? CAMERA_STARTING_TEXT : errorMessage}
          </div>
        )}
      </div>

      {canChooseDevice && (
        <label style={styles.deviceLabel}>
          <span style={styles.deviceText}>{DEVICE_LABEL_TEXT}</span>
          <select
            value={selectedDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
            style={styles.deviceSelect}
          >
            <option value="">{DEFAULT_DEVICE_TEXT}</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'grid',
    gap: '8px',
  },
  shell: {
    position: 'relative',
    overflow: 'hidden',
    width: '180px',
    height: '112px',
    borderRadius: '12px',
    background: '#111827',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)',
  },
  previewCanvas: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  hiddenVideo: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0.005,
    pointerEvents: 'none',
    zIndex: -1,
  },
  status: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    color: '#fff',
    fontSize: '12px',
    lineHeight: 1.4,
    textAlign: 'center',
    background: 'rgba(15, 23, 42, 0.72)',
  },
  deviceLabel: {
    display: 'grid',
    gap: '4px',
    color: '#334155',
    fontSize: '12px',
  },
  deviceText: {
    fontWeight: 700,
  },
  deviceSelect: {
    width: '180px',
    border: '1px solid rgba(148, 163, 184, 0.7)',
    borderRadius: '8px',
    padding: '6px 8px',
    color: '#1e293b',
    background: '#fff',
    fontSize: '12px',
  },
};

function startCanvasPreview(video, canvas) {
  const context = canvas.getContext('2d');
  let frameId = null;
  let stopped = false;

  const drawFrame = () => {
    if (stopped) return;
    if (shouldDrawPreviewFrame(video) && context) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    frameId = requestAnimationFrame(drawFrame);
  };

  frameId = requestAnimationFrame(drawFrame);
  return () => {
    stopped = true;
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }
  };
}

function clearPreview(canvas) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function startVideoHealthMonitor(video, stream, handlers) {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 36;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let blackFrameCount = 0;
  let reportedBlack = false;

  return setInterval(() => {
    const [track] = stream.getVideoTracks();
    if (!track || track.readyState === 'ended' || track.muted) {
      handlers.onTrackLost();
      return;
    }

    if (!context || !shouldDrawPreviewFrame(video)) {
      return;
    }

    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const isBlack = isMostlyBlackFrame(pixels, { blackThreshold: 24, blackRatio: 0.9 });

      if (isBlack) {
        blackFrameCount += 1;
        if (blackFrameCount >= 4 && !reportedBlack) {
          reportedBlack = true;
          handlers.onBlackFrame();
        }
        return;
      }

      blackFrameCount = 0;
      if (reportedBlack) {
        reportedBlack = false;
        handlers.onRecovered();
      }
    } catch (error) {
      // A transient drawImage failure should not tear down the camera.
    }
  }, 450);
}
