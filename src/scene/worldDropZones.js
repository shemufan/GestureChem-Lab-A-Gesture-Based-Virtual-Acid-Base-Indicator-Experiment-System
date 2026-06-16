import { WASTE_SINK_WORLD } from './worldLayout';

export const WORLD_DROP_ZONES = {
  face_area: {
    id: 'face_area',
    center: [2.85, 0.15, 1.9],
    radius: 1.05,
  },
  beaker_zone: {
    id: 'beaker_zone',
    center: [0, 0.5, 0],
    radius: 0.9,
  },
  waste_bin: {
    id: 'waste_bin',
    center: WASTE_SINK_WORLD.position,
    radius: 1.05,
  },
};

export function findWorldDropZone(position) {
  if (!position) return 'table';

  const [x, , z] = position;

  for (const zone of Object.values(WORLD_DROP_ZONES)) {
    const [cx, , cz] = zone.center;

    const dx = x - cx;
    const dz = z - cz;
    const distanceXZ = Math.sqrt(dx * dx + dz * dz);

    if (distanceXZ <= zone.radius) {
      return zone.id;
    }
  }

  return 'table';
}
