import React, { useState, useEffect } from 'react';
import LabScene from './components/LabScene';
import SafetyPanel from './components/SafetyPanel';
import ResultPanel from './components/ResultPanel';
import { EXPERIMENT_STEPS, INITIAL_STATE } from './experiment/experimentSteps';
import { processAction } from './experiment/workflowEngine';

function App() {
  const [state, setState] = useState(INITIAL_STATE);
  const [showSafety, setShowSafety] = useState(false);
  const [showResultDelay, setShowResultDelay] = useState(false); // 控制结果延迟弹出

  // 监听实验完成状态
  useEffect(() => {
    if (state.isCompleted) {
      // 实验完成后，等待 3 秒再显示总结，让用户观察最后一步的变色
      const timer = setTimeout(() => {
        setShowResultDelay(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.isCompleted]);

  const handleAction = (objectId) => {
    // 如果已经完成，不再响应点击
    if (state.isCompleted) return;

    const targetZone = objectId === 'goggles' ? 'user_head' : 'beaker';
    const newState = processAction(state, { objectId, zoneId: targetZone });
    
    setState(newState);
    if (newState.error) setShowSafety(true);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#fff' }}>
      <LabScene 
        currentStep={EXPERIMENT_STEPS[state.currentStepIndex]} 
        beakerColor={state.beakerLiquidColor}
        onObjectClick={handleAction}
      />

      {/* 顶部步骤指引 (浮动手感) */}
      {!state.isCompleted && (
        <div style={uiStyles.stepPanel}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>当前目标</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
            {EXPERIMENT_STEPS[state.currentStepIndex].instruction}
          </div>
        </div>
      )}

      {/* 成功后的即时反馈文字 */}
      {state.isCompleted && !showResultDelay && (
        <div style={uiStyles.successToast}>
          🎉 滴定终点已达到！请观察颜色变化...
        </div>
      )}

      <SafetyPanel 
        visible={showSafety} 
        message={state.error} 
        onClose={() => setShowSafety(false)} 
      />

      {/* 只有在延迟结束后才渲染结果面板 */}
      {showResultDelay && (
        <ResultPanel 
          score={state.score} 
          logs={state.logs} 
          timeElapsed={60} 
          onRestart={() => window.location.reload()} 
        />
      )}
    </div>
  );
}

const uiStyles = {
  stepPanel: {
    position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(255,255,255,0.95)', padding: '20px 50px', borderRadius: '15px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid #eee', textAlign: 'center'
  },
  successToast: {
    position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)',
    background: '#2ecc71', color: 'white', padding: '15px 30px', borderRadius: '50px',
    fontSize: '20px', fontWeight: 'bold', boxShadow: '0 10px 30px rgba(46,204,113,0.4)',
    animation: 'pulse 1.5s infinite'
  }
};

export default App;