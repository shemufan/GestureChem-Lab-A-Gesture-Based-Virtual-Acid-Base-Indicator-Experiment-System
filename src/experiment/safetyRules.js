export const SAFETY_RULES = {
  CORROSIVE_SUBSTANCES: ['acid', 'base'],

  validateAction: (state, objectId) => {
    if (SAFETY_RULES.CORROSIVE_SUBSTANCES.includes(objectId) && !state.hasGoggles) {
      return {
        isSafe: false,
        errorType: 'PPE_MISSING',
        message: `安全警告：你正在尝试操作 ${objectId === 'acid' ? '强酸' : '强碱'}。请先佩戴护目镜。`,
      };
    }

    return { isSafe: true, error: null };
  },

  getPenalty: (errorType) => {
    const penalties = {
      PPE_MISSING: 15,
      SEQUENCE_ERROR: 5,
      SPILLAGE: 10,
    };
    return penalties[errorType] || 5;
  },
};
