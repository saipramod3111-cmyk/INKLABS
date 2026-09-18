import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { Garment } from './Garment.jsx';

export default function Viewer({ productType = 'tshirt', color, style, front, back, autoRotate = false, onCreated, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [0, 0.3, 5.6], fov: 35 }}
        onCreated={onCreated}
      >
        <color attach="background" args={['#f3f4f6']} />
        <ambientLight intensity={0.7} />
        <hemisphereLight intensity={0.35} groundColor="#8a8a8a" />
        <directionalLight position={[3, 6, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 3, -4]} intensity={0.6} />
        <Garment type={productType} color={color} style={style} front={front} back={back} />
        <ContactShadows position={[0, -1.3, 0]} opacity={0.45} blur={2.4} scale={7} far={2.5} />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={3}
          maxDistance={9}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
        />
      </Canvas>
    </div>
  );
}
