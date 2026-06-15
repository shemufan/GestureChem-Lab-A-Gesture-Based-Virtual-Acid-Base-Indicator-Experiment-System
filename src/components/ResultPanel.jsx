import React from 'react';

const ResultPanel = ({ score, logs, timeElapsed, onRestart }) => {
  // 根据分数给评价
  const getEvaluation = (s) => {
    if (s >= 100) return { text: "完美！卓越的实验室准则执行者。", color: "#27ae60" };
    if (s >= 80) return { text: "良好。操作基本规范，注意微小细节。", color: "#2ecc71" };
    return { text: "需改进。请务必遵守实验室安全守则！", color: "#e67e22" };
  };

  const evaluation = getEvaluation(score);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(44, 62, 80, 0.95)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000, color: 'white', fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: '#fff', color: '#333', padding: '40px', borderRadius: '20px',
        width: '80%', maxWidth: '600px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <h1 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '10px' }}>实验报告总结</h1>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: evaluation.color }}>
            {score} <span style={{ fontSize: '20px' }}>分</span>
          </div>
          <p style={{ color: evaluation.color, fontWeight: 'bold' }}>{evaluation.text}</p>
        </div>

        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
          <h4 style={{ marginTop: 0 }}>📊 统计信息:</h4>
          <p>完成耗时：{timeElapsed} 秒</p>
          <p>安全违规次数：{logs.filter(l => l.msg.includes("警告")).length} 次</p>
        </div>

        <div style={{ height: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '5px', fontSize: '0.9rem' }}>
          <h4 style={{ marginTop: 0 }}>📝 操作流水:</h4>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '5px', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#95a5a6' }}>[{log.time}]</span> {log.msg}
            </div>
          ))}
        </div>

        <button 
          onClick={() => window.location.reload()} // 简单实现重启
          style={{
            width: '100%', marginTop: '30px', padding: '15px',
            backgroundColor: '#3498db', color: 'white', border: 'none',
            borderRadius: '10px', fontSize: '1.1rem', cursor: 'pointer',
            transition: 'background 0.3s'
          }}
          onMouseOver={(e) => e.target.style.background = '#2980b9'}
          onMouseOut={(e) => e.target.style.background = '#3498db'}
        >
          重新开始实验
        </button>
      </div>
    </div>
  );
};

export default ResultPanel;