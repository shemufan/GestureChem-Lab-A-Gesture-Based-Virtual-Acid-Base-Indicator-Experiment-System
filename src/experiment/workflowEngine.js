import { EXPERIMENT_STEPS } from './experimentSteps';
import { SAFETY_RULES } from './safetyRules';
import { CHEMISTRY_RULES } from './chemistryRules';

export const processAction = (state, action) => {
  const { currentStepIndex, hasGoggles, score, logs, phValue, hasIndicator } = state;
  const currentStep = EXPERIMENT_STEPS[currentStepIndex];

  // 1. 首先进行安全拦截
  const safetyStatus = SAFETY_RULES.validateAction(state, action.objectId);
  if (!safetyStatus.isSafe) {
    return {
      ...state,
      error: safetyStatus.message,
      score: Math.max(0, score - SAFETY_RULES.getPenalty(safetyStatus.errorType)),
      logs: [...logs, { time: new Date().toLocaleTimeString(), msg: `⚠️ 安全违规: ${safetyStatus.message}` }]
    };
  }

  // 2. 检查操作是否属于当前实验步骤
  const isCorrectObject = action.objectId === currentStep.targetObject;
  const isCorrectZone = action.zoneId === currentStep.targetZone;

  if (isCorrectObject && isCorrectZone) {
    // 3. 计算化学反应结果
    const updatedIndicator = action.objectId === 'indicator_bottle' ? true : hasIndicator;
    const reaction = CHEMISTRY_RULES.calculateReaction(
      action.objectId, 
      phValue || 7, // 默认 pH 为 7
      updatedIndicator
    );

    const isLastStep = currentStepIndex === EXPERIMENT_STEPS.length - 1;
    const newHasGoggles = action.objectId === 'goggles' ? true : hasGoggles;

    return {
      ...state,
      currentStepIndex: isLastStep ? currentStepIndex : currentStepIndex + 1,
      hasGoggles: newHasGoggles,
      hasIndicator: updatedIndicator,
      phValue: reaction.newPH,
      beakerLiquidColor: reaction.color || state.beakerLiquidColor,
      isCompleted: isLastStep,
      error: null,
      logs: [...logs, { 
        time: new Date().toLocaleTimeString(), 
        msg: `✅ 完成: ${CHEMISTRY_RULES.getDisplayName(action.objectId)} 操作成功。当前 pH: ${reaction.newPH.toFixed(1)}` 
      }]
    };
  } else {
    // 4. 错误操作反馈
    const expectedName = CHEMISTRY_RULES.getDisplayName(currentStep.targetObject);
    return {
      ...state,
      error: `步骤错误：当前应执行“${currentStep.instruction}”。请使用 ${expectedName}。`,
      score: Math.max(0, score - 5),
      logs: [...logs, { time: new Date().toLocaleTimeString(), msg: `❌ 误用: ${action.objectId}` }]
    };
  }
};