// Shared geometry / math utilities used across gesture modules.

export function distance2d(a, b) {
  if (!a || !b) return Infinity;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distance3d(a, b) {
  const dz = (a.z ?? 0.35) - (b.z ?? 0.35);
  const xy = distance2d(a, b);
  return Math.sqrt(xy * xy + dz * dz * 10000);
}

export function normalizeZ(value, fallback = 0.35) {
  return typeof value === 'number' ? value : fallback;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function round3(value) {
  return Math.round(value * 1000) / 1000;
}

export function normalizePoint(point) {
  return {
    x: point?.x || 0,
    y: point?.y || 0,
    z: typeof point?.z === 'number' ? point.z : 0,
  };
}
