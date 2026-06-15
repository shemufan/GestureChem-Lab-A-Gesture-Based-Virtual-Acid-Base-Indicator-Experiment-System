/**
 * Camera module: handles webcam access and lifecycle.
 */

export async function startCamera(videoElement, options = {}) {
  const {
    facingMode = 'user',
    width = 640,
    height = 480,
    deviceId,
    requireVisibleFrame = true,
  } = options;

  const videoConstraints = {
    width: { ideal: width },
    height: { ideal: height },
  };

  if (deviceId) {
    videoConstraints.deviceId = { exact: deviceId };
  } else {
    videoConstraints.facingMode = facingMode;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });
  } catch (err) {
    throw normalizeError(err);
  }

  videoElement.muted = true;
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  videoElement.srcObject = stream;

  try {
    await playVideo(videoElement);
    await waitForUsableVideoFrame(videoElement);
    if (requireVisibleFrame) {
      await waitForNonBlackVideoFrame(videoElement);
    }
  } catch (err) {
    stopCamera(stream, videoElement);
    throw normalizeError(err);
  }

  return {
    stream,
    stop: () => stopCamera(stream, videoElement),
  };
}

export async function listVideoDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === 'videoinput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `摄像头 ${index + 1}`,
    }));
}

export function stopCamera(stream, videoElement) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  if (videoElement) {
    videoElement.pause?.();
    videoElement.srcObject = null;
    videoElement.removeAttribute('src');
    videoElement.load?.();
  }
}

export function isInterruptedPlayError(err) {
  const message = err?.message || '';
  return (
    err?.name === 'AbortError'
    || message.includes('play() request was interrupted')
  );
}

export function hasUsableVideoFrame(videoElement) {
  return (
    videoElement?.readyState >= 2
    && videoElement.videoWidth > 0
    && videoElement.videoHeight > 0
  );
}

export function isMostlyBlackFrame(pixelData, options = {}) {
  const {
    blackThreshold = 18,
    blackRatio = 0.94,
  } = options;

  if (!pixelData || pixelData.length < 4) return false;

  let blackPixels = 0;
  let visiblePixels = 0;

  for (let index = 0; index < pixelData.length; index += 4) {
    const alpha = pixelData[index + 3] ?? 255;
    if (alpha < 16) continue;

    const luminance = (
      pixelData[index] * 0.2126
      + pixelData[index + 1] * 0.7152
      + pixelData[index + 2] * 0.0722
    );
    visiblePixels++;
    if (luminance <= blackThreshold) blackPixels++;
  }

  return visiblePixels > 0 && blackPixels / visiblePixels >= blackRatio;
}

async function playVideo(videoElement, attempts = 2) {
  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      await videoElement.play();
      return;
    } catch (err) {
      if (!isInterruptedPlayError(err) || attempt === attempts) {
        throw err;
      }
      await waitForVideoLoad(videoElement);
    }
  }
}

function waitForUsableVideoFrame(videoElement, timeoutMs = 2500) {
  if (hasUsableVideoFrame(videoElement)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let frameRequestId = null;
    let timeoutId = null;

    const cleanup = () => {
      videoElement.removeEventListener('loadeddata', check);
      videoElement.removeEventListener('canplay', check);
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (
        frameRequestId !== null
        && typeof videoElement.cancelVideoFrameCallback === 'function'
      ) {
        videoElement.cancelVideoFrameCallback(frameRequestId);
      }
    };

    const finish = () => {
      cleanup();
      resolve();
    };

    const fail = () => {
      cleanup();
      reject(createNoFrameError());
    };

    function check() {
      if (hasUsableVideoFrame(videoElement)) finish();
    }

    videoElement.addEventListener('loadeddata', check);
    videoElement.addEventListener('canplay', check);

    if (typeof videoElement.requestVideoFrameCallback === 'function') {
      frameRequestId = videoElement.requestVideoFrameCallback(() => check());
    }

    timeoutId = setTimeout(() => {
      if (hasUsableVideoFrame(videoElement)) finish();
      else fail();
    }, timeoutMs);
  });
}

function waitForNonBlackVideoFrame(videoElement, timeoutMs = 2200) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 36;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      resolve();
      return;
    }

    const check = () => {
      if (!hasUsableVideoFrame(videoElement)) {
        schedule();
        return;
      }

      try {
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        if (!isMostlyBlackFrame(pixels)) {
          resolve();
          return;
        }
      } catch (err) {
        reject(err);
        return;
      }

      if (performance.now() - startedAt >= timeoutMs) {
        reject(createBlackFrameError());
        return;
      }

      schedule();
    };

    const schedule = () => setTimeout(check, 120);
    schedule();
  });
}

function waitForVideoLoad(videoElement) {
  if (videoElement.readyState >= 2) {
    return new Promise((resolve) => setTimeout(resolve, 80));
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      videoElement.removeEventListener('loadeddata', cleanup);
      videoElement.removeEventListener('loadedmetadata', cleanup);
      resolve();
    };
    videoElement.addEventListener('loadeddata', cleanup, { once: true });
    videoElement.addEventListener('loadedmetadata', cleanup, { once: true });
    setTimeout(cleanup, 250);
  });
}

function createNoFrameError() {
  const error = new Error('Camera permission was granted, but no visible video frame arrived.');
  error.name = 'NoVideoFrameError';
  return error;
}

function createBlackFrameError() {
  const error = new Error('Camera is connected, but the video frame is black.');
  error.name = 'BlackFrameError';
  return error;
}

export function getVideoRenderRect(videoEl) {
  const rect = videoEl.getBoundingClientRect();
  const elemW = rect.width;
  const elemH = rect.height;

  const videoW = videoEl.videoWidth || videoEl.width || 640;
  const videoH = videoEl.videoHeight || videoEl.height || 480;

  const videoAspect = videoW / videoH;
  const elemAspect = elemW / elemH;

  let renderW;
  let renderH;
  let offsetX;
  let offsetY;

  if (elemAspect > videoAspect) {
    renderH = elemH;
    renderW = renderH * videoAspect;
    offsetX = (elemW - renderW) / 2;
    offsetY = 0;
  } else {
    renderW = elemW;
    renderH = renderW / videoAspect;
    offsetX = 0;
    offsetY = (elemH - renderH) / 2;
  }

  return {
    left: rect.left + offsetX,
    top: rect.top + offsetY,
    width: renderW,
    height: renderH,
  };
}

export function videoToPageCoords(nx, ny, videoEl) {
  const r = getVideoRenderRect(videoEl);
  const mirroredNx = 1 - nx;

  return {
    x: r.left + mirroredNx * r.width,
    y: r.top + ny * r.height,
  };
}

function normalizeError(err) {
  const name = err?.name || 'UnknownError';

  const messages = {
    NotAllowedError: '摄像头权限被拒绝。请在浏览器设置中允许访问摄像头，然后刷新页面。',
    NotFoundError: '未检测到摄像头。请确认摄像头已连接并重试。',
    NotReadableError: '摄像头可能被其他应用占用。请关闭其他使用摄像头的程序后重试。',
    OverconstrainedError: '无法满足摄像头参数要求。请尝试使用默认摄像头。',
    NoVideoFrameError: '摄像头已授权，但没有收到可显示的视频画面。请检查摄像头选择、隐私挡板或其他软件占用。',
    BlackFrameError: '摄像头已连接，但画面持续为黑。请切换摄像头、关闭隐私挡板，或退出占用摄像头的软件。',
  };

  return {
    type: name,
    message: messages[name] || `摄像头访问失败：${err?.message || '未知错误'}`,
    originalError: err,
  };
}
