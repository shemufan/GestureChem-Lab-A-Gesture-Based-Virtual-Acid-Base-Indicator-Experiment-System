import React from 'react';

/**
 * SafetyPanel 组件：用于显示安全警告和操作错误
 * @param {string} message - 警告的具体内容
 * @param {boolean} visible - 是否显示
 * @param {function} onClose - 关闭弹窗的回调函数
 */
const SafetyPanel = ({ message, visible, onClose }) => {
  if (!visible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* 顶部警告图标 */}
        <div style={styles.iconContainer}>
          <span style={styles.icon}>⚠️</span>
        </div>

        <h2 style={styles.title}>实验操作提示</h2>
        
        <div style={styles.messageBox}>
          <p style={styles.messageText}>{message}</p>
        </div>

        <button 
          onClick={onClose} 
          style={styles.button}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#c0392b')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#e74c3c')}
        >
          我已了解，继续实验
        </button>
      </div>

      {/* 内联动画样式 */}
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0,
    width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // 半透明遮罩
    backdropFilter: 'blur(8px)', // 磨砂玻璃效果
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // 确保在最上层
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    border: '2px solid #e74c3c',
    animation: 'fadeInScale 0.3s ease-out forwards',
  },
  iconContainer: {
    fontSize: '50px',
    marginBottom: '15px',
  },
  title: {
    color: '#e74c3c',
    margin: '0 0 10px 0',
    fontSize: '22px',
    fontWeight: 'bold',
  },
  messageBox: {
    margin: '20px 0 30px 0',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    color: '#2c3e50',
    fontSize: '16px',
    lineHeight: '1.6',
    margin: 0,
  },
  button: {
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
  }
};

export default SafetyPanel;