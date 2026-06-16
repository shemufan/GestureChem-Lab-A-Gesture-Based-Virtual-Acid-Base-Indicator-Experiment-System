import React, { useState } from 'react';

const StepPanel = ({ steps, currentStepIndex, isCompleted }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (isCompleted) return null;

  return (
    <div style={{
      ...styles.container,
      transform: isOpen ? 'translateX(0)' : 'translateX(-280px)', // 展开/收起动画
    }}>
      {/* 侧边栏内容区 */}
      <div style={styles.content}>
        <h3 style={styles.header}>实验手册</h3>
        <div style={styles.list}>
          {steps.map((step, index) => {
            const isDone = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.id} style={{
                ...styles.item,
                backgroundColor: isCurrent ? 'rgba(52, 152, 219, 0.15)' : 'transparent',
                borderLeft: isCurrent ? '4px solid #3498db' : '4px solid transparent',
              }}>
                <div style={{
                  ...styles.statusIcon,
                  backgroundColor: isDone ? '#2ecc71' : isCurrent ? '#3498db' : '#dfe6e9'
                }}>
                  {isDone ? '✓' : index + 1}
                </div>
                <div style={{
                  ...styles.text,
                  color: isDone ? '#b2bec3' : isCurrent ? '#2d3436' : '#636e72',
                  textDecoration: isDone ? 'line-through' : 'none',
                  fontWeight: isCurrent ? 'bold' : 'normal'
                }}>
                  {step.instruction}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 书签拉手按钮 */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={styles.handle}
      >
        <span style={styles.handleIcon}>{isOpen ? '◀' : '📖'}</span>
        <span style={styles.handleText}>{isOpen ? '收起' : '实验流程'}</span>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    left: 0,
    top: '20px',
    width: '280px',
    height: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    boxShadow: '5px 0 25px rgba(0,0,0,0.1)',
    borderRadius: '0 20px 20px 0',
    display: 'flex',
    transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  content: {
    flex: 1,
    padding: '25px',
    overflowY: 'auto',
  },
  header: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    color: '#2d3436',
    borderBottom: '2px solid #3498db',
    paddingBottom: '10px',
    display: 'flex',
    alignItems: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px',
    borderRadius: '10px',
    transition: 'all 0.3s',
  },
  statusIcon: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    color: 'white',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    marginTop: '2px',
    flexShrink: 0,
  },
  text: {
    fontSize: '14px',
    lineHeight: '1.4',
  },
  handle: {
    position: 'absolute',
    right: '-45px',
    top: '40px',
    width: '45px',
    padding: '15px 0',
    backgroundColor: '#3498db',
    color: 'white',
    borderRadius: '0 12px 12px 0',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '4px 0 10px rgba(52, 152, 219, 0.3)',
    gap: '8px',
  },
  handleIcon: { fontSize: '18px' },
  handleText: {
    writingMode: 'vertical-rl',
    fontSize: '13px',
    letterSpacing: '2px',
    fontWeight: 'bold',
  }
};

export default StepPanel;