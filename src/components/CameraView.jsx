import { useEffect, useRef, useState } from 'react';
import { isMostlyBlackFrame, listVideoDevices, startCamera } from '../gesture/camera.js';
import { shouldDrawPreviewFrame } from './cameraPreview.js';

const CAMERA_STARTING_TEXT = '正在启动摄像头...';
const CAMERA_START_FAILED_TEXT = '摄像头启动失败，可继续使用鼠标操作。';
const BLACK_FRAME_TEXT = '摄像头已连接，但预览持续黑屏。请切换摄像头、关闭隐私遮挡，或退出占用摄像头的软件。';
const TRACK_LOST_TEXT = '摄像头视频流已中断。请刷新页面或重新选择摄像头。';
const DEVICE_LABEL_TEXT = '摄像头';
const DEFAULT_DEVICE_TEXT = '默认摄像头';

export default function CameraView({ onStreamReady, onVideoReady, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const monitorRef = useRef(null);
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
    if (!video) return undefined;

    let cancelled = false;
    setStatus('loading');
    setErrorMessage('');

    const stopCurrentStream = () => {
      if (monitorRef.current !== null) {
        clearInterval(monitorRef.current);
        monitorRef.current = null;
      }
      streamRef.current?.stop();
      streamRef.current = null;
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
        {/* Video element is the direct visual preview — no canvas drawImage needed.
            This avoids the Chrome/GPU-delegate drawImage→black bug entirely. */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            ...styles.previewVideo,
            opacity: status === 'live' ? 1 : 0.35,
          }}
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
  previewVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
    border: '2px solid #2ecc71',
    boxSizing: 'border-box',
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
    } catch (_error) {
      // transient drawImage failure — ignore
    }
  }, 450);
}
