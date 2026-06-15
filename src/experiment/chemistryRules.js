const INDICATOR_COLORS = {
  phenolphthalein: (ph) => {
    if (ph <= 8.2) return "#e3f2fd"; // 酸性时显示浅蓝色（表示烧杯里有盐酸）
    return "#ff0080"; // 碱性时显示粉
  },
};

export const CHEMISTRY_RULES = {
  calculateReaction: (objectId, currentPH, hasIndicator) => {
    // 如果还没开始（或者是第一步戴护目镜），保持空瓶颜色
    if (objectId === 'goggles' && currentPH === 7.0) {
      return { newPH: 7.0, color: "#f0f0f0" };
    }

    let newPH = currentPH;
    if (objectId === 'acid_bottle') newPH = 1.0;
    if (objectId === 'base_bottle') newPH = 12.0;
    
    let finalColor = "#f0f0f0"; 

    if (hasIndicator) {
      // 酚酞显色逻辑
      finalColor = (newPH > 8.2) ? "#ff007f" : "#d1e9ff"; 
    } else {
      // 只要加了酸/碱，就显示浅蓝色表示有液体
      if (objectId === 'acid_bottle' || objectId === 'base_bottle') {
        finalColor = "#d1e9ff"; 
      }
    }

    return { newPH, color: finalColor };
  },

  
  getDisplayName: (id) => {
    const names = { acid_bottle: "盐酸", base_bottle: "氢氧化钠", indicator_bottle: "酚酞", goggles: "护目镜" };
    return names[id] || id;
  }
};