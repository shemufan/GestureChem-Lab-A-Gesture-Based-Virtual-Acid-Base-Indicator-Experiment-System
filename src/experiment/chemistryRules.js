export const CHEMISTRY_RULES = {
  calculateReaction: (objectId, currentPH, hasIndicator) => {
    if (objectId === 'goggles') {
      return { newPH: currentPH, color: '#f0f0f0' };
    }

    if (objectId === 'beaker') {
      return { newPH: currentPH, color: objectId === 'beaker' ? undefined : '#f0f0f0' };
    }

    let newPH = currentPH;
    if (objectId === 'acid') newPH = 1.0;
    if (objectId === 'base') newPH = 12.0;

    let color = '#f0f0f0';
    if (objectId === 'acid' || objectId === 'indicator') color = '#d1e9ff';
    if (hasIndicator && newPH > 8.2) color = '#ff007f';

    return { newPH, color };
  },

  getDisplayName: (id) => {
    const names = {
      goggles: '护目镜',
      acid: '盐酸',
      indicator: '酚酞',
      base: '氢氧化钠',
      beaker: '烧杯',
    };
    return names[id] || id;
  },
};
