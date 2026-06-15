/**
 * 实验步骤配置文件
 * 每一个步骤包含：提示语、目标物体、目标区域、成功后的视觉反馈
 */

export const EXPERIMENT_STEPS = [
  {
    id: 0,
    instruction: "安全第一：请佩戴护目镜 (Goggles)",
    targetObject: "goggles",
    targetZone: "user_head", // 假设 A 识别手势移到头部区域
    actionType: "EQUIP",
    successMessage: "防护装备已就绪！",
    requiredSafety: false, // 这一步本身就是安全检查
  },
  {
    id: 1,
    instruction: "请将 20ml 盐酸 (HCl) 倒入烧杯中",
    targetObject: "acid_bottle",
    targetZone: "beaker",
    actionType: "POUR",
    liquidColor: "#FFFFFF", // 初始透明
    successMessage: "盐酸已加入。",
    requiredSafety: true, // 必须戴了护目镜才能做
  },
  {
    id: 2,
    instruction: "向烧杯中滴入 2 滴酚酞指示剂 (Phenolphthalein)",
    targetObject: "indicator_bottle",
    targetZone: "beaker",
    actionType: "DROP",
    liquidColor: "#FFFFFF", // 酚酞遇酸不变色
    successMessage: "指示剂已添加，准备进行滴定。",
    requiredSafety: true,
  },
  {
    id: 3,
    instruction: "缓慢加入氢氧化钠 (NaOH) 进行中和反应",
    targetObject: "base_bottle",
    targetZone: "beaker",
    actionType: "POUR",
    liquidColor: "#FF69B4", // 变粉色（到达滴定终点）
    successMessage: "实验成功！溶液变为粉红色，达到滴定终点。",
    requiredSafety: true,
  }
];

// 初始环境状态
export const INITIAL_STATE = {
  currentStepIndex: 0,
  hasGoggles: false,
  beakerLiquidColor: "#f0f0f0", // 初始空烧杯颜色
  isCompleted: false,
  score: 100, // 初始分数，犯错扣分
  logs: []    // 操作记录
};

/**
 * 辅助函数：根据 ID 获取当前步骤详情
 */
export const getStepDetails = (index) => {
  return EXPERIMENT_STEPS[index] || null;
};