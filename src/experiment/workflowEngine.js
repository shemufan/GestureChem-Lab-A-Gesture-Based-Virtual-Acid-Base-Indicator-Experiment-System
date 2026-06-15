import { LEGACY_OBJECT_ID_MAP, LEGACY_ZONE_ID_MAP } from '../constants/labConfig.js';
import { CHEMISTRY_RULES } from './chemistryRules.js';
import { EXPERIMENT_STEPS } from './experimentSteps.js';
import { SAFETY_RULES } from './safetyRules.js';

export function normalizeDropAction(objectId, targetZone) {
  return {
    objectId: LEGACY_OBJECT_ID_MAP[objectId] || objectId,
    zoneId: LEGACY_ZONE_ID_MAP[targetZone] || targetZone,
  };
}

export const processAction = (state, action) => {
  if (state.isCompleted) return state;

  const normalized = normalizeDropAction(action.objectId, action.zoneId ?? action.targetZone);
  const { objectId, zoneId } = normalized;
  const { currentStepIndex, hasGoggles, score, logs, phValue, hasIndicator } = state;
  const currentStep = EXPERIMENT_STEPS[currentStepIndex];

  const safetyStatus = SAFETY_RULES.validateAction(state, objectId);
  if (!safetyStatus.isSafe) {
    return {
      ...state,
      error: safetyStatus.message,
      score: Math.max(0, score - SAFETY_RULES.getPenalty(safetyStatus.errorType)),
      logs: [...logs, { time: new Date().toLocaleTimeString(), msg: `⚠️ 安全违规: ${safetyStatus.message}` }],
    };
  }

  const isCorrectObject = objectId === currentStep.targetObject;
  const isCorrectZone = zoneId === currentStep.targetZone;

  if (!isCorrectObject || !isCorrectZone) {
    const expectedName = CHEMISTRY_RULES.getDisplayName(currentStep.targetObject);
    return {
      ...state,
      error: `步骤错误：当前应执行“${currentStep.instruction}”。请使用 ${expectedName}。`,
      score: Math.max(0, score - 5),
      logs: [...logs, { time: new Date().toLocaleTimeString(), msg: `❌ 误用: ${objectId}` }],
    };
  }

  const updatedIndicator = objectId === 'indicator' ? true : hasIndicator;
  const reaction = CHEMISTRY_RULES.calculateReaction(objectId, phValue || 7, updatedIndicator);
  const isLastStep = currentStepIndex === EXPERIMENT_STEPS.length - 1;
  const newColor = currentStep.actionType === 'DISPOSE'
    ? '#f0f0f0'
    : reaction.color || state.beakerLiquidColor;

  return {
    ...state,
    currentStepIndex: isLastStep ? currentStepIndex : currentStepIndex + 1,
    hasGoggles: objectId === 'goggles' ? true : hasGoggles,
    hasIndicator: updatedIndicator,
    hasWaste: currentStep.actionType === 'DISPOSE' ? false : objectId !== 'goggles',
    phValue: reaction.newPH,
    beakerLiquidColor: newColor,
    isCompleted: isLastStep,
    error: null,
    logs: [
      ...logs,
      {
        time: new Date().toLocaleTimeString(),
        msg: `✅ 完成: ${CHEMISTRY_RULES.getDisplayName(objectId)}。${currentStep.successMessage}`,
      },
    ],
  };
};
