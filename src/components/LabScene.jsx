import React, { forwardRef, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Float, OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { STATIC_OBJECT_WORLD, WASTE_SINK_WORLD } from '../scene/worldLayout';
import ScenePointerController from './ScenePointerController';

const glassMaterialProps = {
  transparent: true,
  opacity: 0.2,
  metalness: 0.1,
  roughness: 0,
  transmission: 0.9,
  thickness: 0.5,
  clearcoat: 1,
  clearcoatRoughness: 0,
  side: THREE.DoubleSide,
};

// ── TestTube ──────────────────────────────────────────────────────────────

function TestTube({
  id,
  position,
  rotation,
  scale,
  liquidColor,
  label,
  onClick,
  onPointerDown,
  highlighted,
  isHeld,
  registerHitbox,
}) {
  const tubeBody = (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible hitbox for raycaster */}
      <mesh
        ref={registerHitbox}
        visible={false}
        userData={{ objectId: id, draggable: true }}
      >
        <boxGeometry args={[0.3, 1.15, 0.3]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 32, 1, true]} />
        <meshPhysicalMaterial {...glassMaterialProps} color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.08, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI]} />
        <meshPhysicalMaterial {...glassMaterialProps} color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.5, 32]} />
        <meshStandardMaterial
          color={liquidColor}
          transparent
          opacity={0.8}
          roughness={0.1}
          metalness={0.2}
          emissive={highlighted ? '#e8f7ff' : '#000000'}
          emissiveIntensity={highlighted ? 0.22 : 0}
        />
      </mesh>
      {highlighted && (
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.92, 32, 1, true]} />
          <meshBasicMaterial color="#5dade2" transparent opacity={0.16} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Text position={[0, 1.0, 0]} fontSize={0.12} color="#2c3e50" fontWeight="bold">
        {label}
      </Text>
    </group>
  );

  return isHeld ? tubeBody : (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.4}>
      {tubeBody}
    </Float>
  );
}

// ── TestTubeRack ──────────────────────────────────────────────────────────

function TestTubeRack({ position: rackPos }) {
  return (
    <group position={rackPos}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[1.5, 0.1, 0.6]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.5, 0.05, 0.6]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.3} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.25, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5]} />
          <meshStandardMaterial color="#bdc3c7" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// ── Goggles ───────────────────────────────────────────────────────────────

function Goggles({
  position,
  rotation,
  scale,
  onClick,
  onPointerDown,
  highlighted,
  registerHitbox,
}) {
  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible hitbox for raycaster */}
      <mesh
        ref={registerHitbox}
        visible={false}
        userData={{ objectId: 'goggles', draggable: true }}
      >
        <boxGeometry args={[0.8, 0.5, 0.25]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.6, 0.25, 0.1]} />
        <meshPhysicalMaterial
          color="#3498db"
          transparent
          opacity={0.4}
          transmission={0.8}
          roughness={0}
          thickness={0.2}
          emissive={highlighted ? '#d8f3ff' : '#000000'}
          emissiveIntensity={highlighted ? 0.2 : 0}
        />
      </mesh>
      {highlighted && (
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.72, 0.36, 0.13]} />
          <meshBasicMaterial color="#5dade2" transparent opacity={0.15} />
        </mesh>
      )}
      <Text position={[0, 0.35, 0]} fontSize={0.1} color="#2c3e50" fontWeight="bold">
        佩戴护目镜
      </Text>
    </group>
  );
}

// ── Beaker ────────────────────────────────────────────────────────────────

function Beaker({ transform, liquidColor, onClick, onPointerDown, highlighted }) {
  const isEmpty = liquidColor === '#f0f0f0' || liquidColor === '#ffffff';

  return (
    <group
      position={transform.position}
      rotation={transform.rotation}
      scale={transform.scale}
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{ cursor: 'pointer' }}
    >
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 1.5, 32, 1, true]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.2}
          metalness={0.2}
          roughness={0}
          side={THREE.DoubleSide}
          emissive={highlighted ? '#e8f7ff' : '#000000'}
          emissiveIntensity={highlighted ? 0.18 : 0}
        />
      </mesh>
      {!isEmpty && (
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.58, 0.58, 0.8, 32]} />
          <meshStandardMaterial color={liquidColor} roughness={0.1} metalness={0.1} />
        </mesh>
      )}
      <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.01, 16, 100]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
      {highlighted && (
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 1.62, 32, 1, true]} />
          <meshBasicMaterial color="#5dade2" transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Text position={[0, 1.8, 0]} fontSize={0.18} color="#2c3e50" fontWeight="bold">
        滴定烧杯
      </Text>
    </group>
  );
}

// ── WasteSink ─────────────────────────────────────────────────────────────

function WasteSink({ highlighted }) {
  return (
    <group position={WASTE_SINK_WORLD.position} rotation={WASTE_SINK_WORLD.rotation} scale={WASTE_SINK_WORLD.scale}>
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <boxGeometry args={[1.1, 0.16, 0.78]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.22} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.82, 0.12, 0.5]} />
        <meshStandardMaterial color="#dfe6e9" roughness={0.18} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.33, 0.025, 16, 64]} />
        <meshStandardMaterial color="#bdc3c7" roughness={0.12} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 48]} />
        <meshStandardMaterial color="#9fb8c4" transparent opacity={0.45} roughness={0.05} />
      </mesh>
      {highlighted && (
        <mesh position={[0, 0.39, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.48, 0.025, 16, 96]} />
          <meshBasicMaterial color="#2ecc71" transparent opacity={0.55} />
        </mesh>
      )}
      <Text position={[0, 0.88, 0]} fontSize={0.12} color="#2c3e50" fontWeight="bold">
        废液槽
      </Text>
    </group>
  );
}

// ── Object renderer config ────────────────────────────────────────────────

const OBJECT_RENDERERS = {
  acid: { label: 'HCl', liquidColor: '#3498db' },
  indicator: { label: '酚酞', liquidColor: '#8e44ad' },
  base: { label: 'NaOH', liquidColor: '#e74c3c' },
};

// ── LabScene ──────────────────────────────────────────────────────────────

const LabScene = forwardRef(({
  beakerColor,
  drag3dState,
  sceneSize,
  sceneCursor,
  onPointer3D,
  onObjectClick,
  onObjectPointerDown,
}, ref) => {
  const hitboxesRef = useRef([]);
  const registerHitbox = useCallback((mesh) => {
    if (!mesh) return;
    if (!hitboxesRef.current.includes(mesh)) {
      hitboxesRef.current.push(mesh);
    }
  }, []);

  const d = drag3dState || {};
  const positions = d.objectWorldPositions || {};
  const draggingId = d.draggingObjectId || null;
  const hoveredId = d.hoveredObjectId || null;
  const nearZoneId = d.nearZoneId || null;

  const makePointerDown = (objectId) => (event) => {
    event.stopPropagation();
    onObjectPointerDown?.(objectId, event.nativeEvent || event);
  };

  const beakerTransform = {
    position: STATIC_OBJECT_WORLD.beaker.position,
    rotation: STATIC_OBJECT_WORLD.beaker.rotation,
    scale: STATIC_OBJECT_WORLD.beaker.scale,
  };

  const gogglesPos = positions.goggles || STATIC_OBJECT_WORLD.goggles.position;

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', background: 'radial-gradient(circle, #ffffff 0%, #d7dada 100%)' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 4, 8]} fov={35} />
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 10, 5]} angle={0.2} penumbra={1} intensity={1.5} castShadow />

        <ScenePointerController
          cursor={sceneCursor}
          sceneSize={sceneSize}
          hitboxesRef={hitboxesRef}
          onPointer3D={onPointer3D}
        />

        <Beaker
          transform={beakerTransform}
          liquidColor={beakerColor}
          highlighted={nearZoneId === 'beaker_zone' || hoveredId === 'beaker'}
          onClick={() => onObjectClick?.('beaker')}
          onPointerDown={makePointerDown('beaker')}
        />

        <TestTubeRack position={[-2.5, 0, 0]} />
        {Object.entries(OBJECT_RENDERERS).map(([id, config]) => (
          <TestTube
            key={id}
            id={id}
            position={positions[id] || STATIC_OBJECT_WORLD[id]?.position || [0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={1}
            liquidColor={config.liquidColor}
            label={config.label}
            highlighted={draggingId === id || hoveredId === id}
            isHeld={draggingId === id}
            registerHitbox={registerHitbox}
            onClick={() => onObjectClick?.(id)}
            onPointerDown={makePointerDown(id)}
          />
        ))}

        <Goggles
          position={gogglesPos}
          rotation={[0, 0, 0]}
          scale={1}
          highlighted={draggingId === 'goggles' || hoveredId === 'goggles' || nearZoneId === 'face_area'}
          registerHitbox={registerHitbox}
          onClick={() => onObjectClick?.('goggles')}
          onPointerDown={makePointerDown('goggles')}
        />

        <WasteSink highlighted={nearZoneId === 'waste_bin'} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.1} metalness={0.05} />
        </mesh>

        <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={15} blur={3} />
        <OrbitControls makeDefault minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
    </div>
  );
});

LabScene.displayName = 'LabScene';

export default LabScene;
