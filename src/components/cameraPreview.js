export function shouldDrawPreviewFrame(video) {
  return Boolean(
    video
    && video.readyState >= 2
    && video.videoWidth > 0
    && video.videoHeight > 0,
  );
}
