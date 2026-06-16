import React, { useEffect } from 'react';

const SafetyPanel = ({ message, visible, onClose }) => {
  // 3秒后自动消失，提升用户体验
  useEffect(() => {
    if (visible && message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, message, onClose]);

  if (!visible || !message) return null;

  return (
    <div style={styles.container}>
      <div style={styles.toast}>
        <span style={{ marginRight: '10px' }}>⚠️</span>
        <span style={styles.text}>{message}</span>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed', top: '85px', left: '50%', transform: 'translateX(-50%)',
    zIndex: 2000, width: 'auto', pointerEvents: 'none' // 允许穿透点击 3D 场景
  },
  toast: {
    background: 'rgba(231, 76, 60, 0.9)', color: 'white',
    padding: '12px 25px', borderRadius: '12px', display: 'flex', alignItems: 'center',
    boxShadow: '0 8px 20px rgba(0,0,0,0.2)', backdropFilter: 'blur(5px)',
    pointerEvents: 'auto', animation: 'slideDown 0.3s ease-out'
  },
  text: { fontSize: '15px', fontWeight: '500' },
  closeBtn: {
    background: 'none', border: 'none', color: 'white', marginLeft: '15px',
    cursor: 'pointer', fontSize: '20px'
  }
};

export default SafetyPanel;