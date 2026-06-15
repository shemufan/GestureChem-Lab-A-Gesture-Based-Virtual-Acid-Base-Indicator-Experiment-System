/**
 * 实验室安全校验系统
 */

export const SAFETY_RULES = {
  // 定义高危物质清单
  CORROSIVE_SUBSTANCES: ['acid_bottle', 'base_bottle'],

  /**
   * 综合安全检查
   */
  validateAction: (state, objectId) => {
    // 检查 1：护目镜检查（最重要的 HCI 逻辑点）
    if (SAFETY_RULES.CORROSIVE_SUBSTANCES.includes(objectId) && !state.hasGoggles) {
      return {
        isSafe: false,
        errorType: "PPE_MISSING",
        message: `安全警告：你正在尝试操作 ${objectId.includes('acid') ? '强酸' : '强碱'}。在未佩戴护目镜的情况下触碰腐蚀性试剂可能导致严重的模拟伤害！`
      };
    }

    // 检查 2：溢出检查（预留：如果物体没对准烧杯）
    // if (distance > threshold) return { isSafe: false, message: "试剂泼洒到了桌面上！" };

    // 检查 3：混合危险（预留：特定化学品不能混合）
    // if (objectId === 'cyanide' && state.inBeaker.has('acid')) return { isSafe: false, message: "警告：这将产生剧毒气体！" };

    return { isSafe: true, error: null };
  },

  /**
   * 获取违规扣分值
   */
  getPenalty: (errorType) => {
    const penalties = {
      PPE_MISSING: 15, // 不穿防护服扣分最重
      SEQUENCE_ERROR: 5,
      SPILLAGE: 10
    };
    return penalties[errorType] || 5;
  }
};