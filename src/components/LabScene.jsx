import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Float, Text, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// --- 玻璃材质配置 ---
const glassMaterialProps = {
  transparent: true,
  opacity: 0.2,
  metalness: 0.1,
  roughness: 0,
  transmission: 0.9, // 让玻璃透光
  thickness: 0.5,    // 模拟玻璃厚度
  clearcoat: 1,      // 外层亮漆面
  clearcoatRoughness: 0,
  side: THREE.DoubleSide,
};

// --- 试管组件 ---
function TestTube({ position, liquidColor, label, onClick }) {
  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.4}>
      <group position={position} onClick={onClick} style={{ cursor: 'pointer' }}>
        {/* 试管玻璃身 */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 32, 1, true]} />
          <meshPhysicalMaterial {...glassMaterialProps} color="#ffffff" />
        </mesh>
        {/* 试管球形底 */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.08, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI]} />
          <meshPhysicalMaterial {...glassMaterialProps} color="#ffffff" />
        </mesh>
        {/* 液体 - 增加通透感 */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.5, 32]} />
          <meshStandardMaterial color={liquidColor} transparent opacity={0.8} roughness={0.1} metalness={0.2} />
        </mesh>
        <Text position={[0, 1.0, 0]} fontSize={0.12} color="#2c3e50" fontWeight="bold">{label}</Text>
      </group>
    </Float>
  );
}

// --- 试管架 ---
function TestTubeRack({ position }) {
  return (
    <group position={position}>
      {/* 磨砂质感架体 */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[1.5, 0.1, 0.6]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.5, 0.05, 0.6]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.3} />
      </mesh>
      {/* 支柱 - 金属质感 */}
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={i} position={[x, 0.25, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5]} />
          <meshStandardMaterial color="#bdc3c7" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// --- 护目镜 ---
function Goggles({ onClick }) {
  return (
    <group position={[2.5, 0.15, 1]} onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* 镜片 */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.6, 0.25, 0.1]} />
        <meshPhysicalMaterial 
          color="#3498db" 
          transparent 
          opacity={0.4} 
          transmission={0.8} 
          roughness={0} 
          thickness={0.2} 
        />
      </mesh>
      <Text position={[0, 0.35, 0]} fontSize={0.1} color="#2c3e50" fontWeight="bold">佩戴护目镜</Text>
    </group>
  );
}

// --- 烧杯组件 ---
function Beaker({ liquidColor }) {
  const isEmpty = liquidColor === "#f0f0f0" || liquidColor === "#ffffff";

  return (
    <group position={[0, 0, 0]}>
      {/* 1. 玻璃外壁 - 使用最稳的透明材质，确保能看穿 */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 1.5, 32, 1, true]} />
        <meshStandardMaterial 
          color="#ffffff" 
          transparent={true} 
          opacity={0.2}  // 降低透明度，确保能看到里面
          metalness={0.2}
          roughness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. 液体 - 核心显色层 */}
      {!isEmpty && (
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.8, 32]} />
        <meshStandardMaterial 
          color={liquidColor} 
          transparent={false} // 关闭液体的透明，让颜色 100% 显示
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      )}
      
      {/* 3. 装饰：顶部的光圈，增加玻璃感 */}
      <mesh position={[0, 1.5, 0]} rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[0.6, 0.01, 16, 100]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>

      <Text position={[0, 1.8, 0]} fontSize={0.18} color="#2c3e50" fontWeight="bold">滴定烧杯</Text>
    </group>
  );
}

const LabScene = ({ currentStep, beakerColor, onObjectClick }) => {
  return (
    <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle, #ffffff 0%, #d7dada 100%)' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 4, 8]} fov={35} />
        
        {/* 反光 */}
        <Environment preset="city" />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 10, 5]} angle={0.2} penumbra={1} intensity={1.5} castShadow />

        <Beaker liquidColor={beakerColor} />

        <group position={[-2.5, 0, 0]}>
          <TestTubeRack position={[0, 0, 0]} />
          <TestTube position={[-0.45, 0.3, 0]} liquidColor="#3498db" label="HCl" onClick={() => onObjectClick('acid_bottle')} />
          <TestTube position={[0, 0.3, 0]} liquidColor="#8e44ad" label="酚酞" onClick={() => onObjectClick('indicator_bottle')} />
          <TestTube position={[0.45, 0.3, 0]} liquidColor="#e74c3c" label="NaOH" onClick={() => onObjectClick('base_bottle')} />
        </group>

        <Goggles onClick={() => onObjectClick('goggles')} />

        {/* 实验室台面 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.1} metalness={0.05} />
        </mesh>
        
        <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={15} blur={3} />
        <OrbitControls makeDefault minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
    </div>
  );
};

export default LabScene;