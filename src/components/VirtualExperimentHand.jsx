export default function VirtualExperimentHand({ visible, x, y, gesture, holdingObjectId }) {
  if (!visible) return null;

  const grabbing = gesture === 'fist' || gesture === 'pinch' || Boolean(holdingObjectId);
  const fingers = grabbing
    ? [
        { left: 18, top: -18, height: 34, rotate: -20 },
        { left: 34, top: -24, height: 38, rotate: -8 },
        { left: 50, top: -22, height: 36, rotate: 8 },
        { left: 66, top: -16, height: 30, rotate: 20 },
      ]
    : [
        { left: 12, top: -45, height: 58, rotate: -24 },
        { left: 30, top: -58, height: 72, rotate: -8 },
        { left: 49, top: -56, height: 70, rotate: 7 },
        { left: 68, top: -46, height: 58, rotate: 22 },
      ];

  return (
    <div
      aria-hidden="true"
      style={{
        ...styles.root,
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${grabbing ? 0.92 : 1})`,
      }}
    >
      {fingers.map((finger, index) => (
        <span
          key={index}
          style={{
            ...styles.finger,
            left: finger.left,
            top: finger.top,
            height: finger.height,
            transform: `rotate(${finger.rotate}deg)`,
          }}
        />
      ))}
      <span style={styles.thumb} />
      <span style={styles.palm} />
      {holdingObjectId && <span style={styles.gripGlow} />}
    </div>
  );
}

const skin = 'rgba(236, 190, 148, 0.86)';
const outline = 'rgba(105, 73, 52, 0.34)';

const styles = {
  root: {
    position: 'absolute',
    zIndex: 6,
    width: '96px',
    height: '96px',
    pointerEvents: 'none',
    filter: 'drop-shadow(0 12px 18px rgba(15, 23, 42, 0.18))',
    transition: 'transform 120ms ease',
  },
  palm: {
    position: 'absolute',
    left: '24px',
    top: '20px',
    width: '54px',
    height: '58px',
    borderRadius: '44% 46% 48% 52%',
    background: skin,
    border: `1px solid ${outline}`,
    boxShadow: 'inset -8px -10px 18px rgba(127, 82, 54, 0.12)',
  },
  finger: {
    position: 'absolute',
    width: '15px',
    borderRadius: '14px',
    background: skin,
    border: `1px solid ${outline}`,
    transformOrigin: '50% 100%',
    boxShadow: 'inset -3px -6px 10px rgba(127, 82, 54, 0.1)',
  },
  thumb: {
    position: 'absolute',
    left: '8px',
    top: '32px',
    width: '34px',
    height: '17px',
    borderRadius: '14px',
    background: skin,
    border: `1px solid ${outline}`,
    transform: 'rotate(-32deg)',
    transformOrigin: '100% 50%',
  },
  gripGlow: {
    position: 'absolute',
    left: '18px',
    top: '13px',
    width: '66px',
    height: '66px',
    borderRadius: '50%',
    border: '2px solid rgba(46, 204, 113, 0.4)',
    boxShadow: '0 0 22px rgba(46, 204, 113, 0.25)',
  },
};
