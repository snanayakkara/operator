/* eslint-disable react/no-unknown-property */
/**
 * Lanyard.tsx - 3D Interactive Lanyard Component
 *
 * A physics-based 3D lanyard card component using Three.js and React Three Fiber.
 * Features interactive dragging and realistic physics simulation.
 *
 * Based on React Bits lanyard component with medical app customizations.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  RigidBodyProps
} from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';

import './Lanyard.css';

// Extend Three.js with MeshLine for the lanyard band
extend({ MeshLineGeometry, MeshLineMaterial });

interface LanyardProps {
  /** Camera position [x, y, z] */
  position?: [number, number, number];
  /** Gravity vector [x, y, z] */
  gravity?: [number, number, number];
  /** Camera field of view */
  fov?: number;
  /** Enable transparent background */
  transparent?: boolean;
  /** Optional text to display on card */
  cardText?: string;
}

/**
 * Main Lanyard component - sets up the Three.js canvas and physics environment
 */
export default function Lanyard({
  position = [0, 0, 20],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  cardText = 'Ready to Record'
}: LanyardProps) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Log when component mounts
    console.log('🎨 Lanyard component mounted');
  }, []);

  if (error) {
    console.error('🎨 Lanyard error:', error);
    return <LanyardFallback text={cardText} />;
  }

  return (
    <div className="lanyard-wrapper">
      <Suspense fallback={<LanyardFallback text={cardText} />}>
        <Canvas
          camera={{ position, fov }}
          gl={{ alpha: transparent }}
          onCreated={({ gl }) => {
            console.log('🎨 Canvas created successfully');
            gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1);
          }}
          onError={(error) => {
            console.error('🎨 Canvas error:', error);
            setError(error as Error);
          }}
        >
          <ambientLight intensity={Math.PI} />
          <Physics gravity={gravity} timeStep={1 / 60}>
            <Band cardText={cardText} />
          </Physics>
          <Environment blur={0.75}>
            <Lightformer
              intensity={2}
              color="white"
              position={[0, -1, 5]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={3}
              color="white"
              position={[-1, -1, 1]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={3}
              color="white"
              position={[1, 1, 1]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={10}
              color="white"
              position={[-10, 0, 14]}
              rotation={[0, Math.PI / 2, Math.PI / 3]}
              scale={[100, 10, 1]}
            />
          </Environment>
        </Canvas>
      </Suspense>
    </div>
  );
}

/**
 * Fallback component shown while assets are loading or if they fail to load
 */
function LanyardFallback({ text }: { text: string }) {
  return (
    <div className="lanyard-loading">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600">{text}</p>
      </div>
    </div>
  );
}

interface BandProps {
  maxSpeed?: number;
  minSpeed?: number;
  cardText?: string;
}

/**
 * Band component - creates the physics-based lanyard with card
 */
function Band({ maxSpeed = 50, minSpeed = 0, cardText = 'Ready to Record' }: BandProps) {
  // Physics body references
  const band = useRef<any>(null);
  const fixed = useRef<any>(null);
  const j1 = useRef<any>(null);
  const j2 = useRef<any>(null);
  const j3 = useRef<any>(null);
  const card = useRef<any>(null);

  // Three.js vector utilities
  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  // Segment physics properties
  const segmentProps: any = {
    type: 'dynamic' as RigidBodyProps['type'],
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4
  };

  // Load 3D model - React hooks must be called unconditionally
  const gltf = useGLTF('/assets/lanyard/card.glb', true) as any;
  const nodes = gltf?.nodes || {};
  const materials = gltf?.materials || {};

  // Load textures - React hooks must be called unconditionally
  const lanyardTexture = useTexture('/assets/lanyard/lanyard.png');
  const microphoneTexture = useTexture('/assets/lanyard/microphone-card.png');

  if (lanyardTexture) {
    lanyardTexture.wrapS = lanyardTexture.wrapT = THREE.RepeatWrapping;
  }

  if (microphoneTexture) {
    // Card texture should not repeat, just display once
    microphoneTexture.wrapS = microphoneTexture.wrapT = THREE.ClampToEdgeWrapping;
  }

  // Create curve for lanyard band
  const curve = useState(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3()
    ]);
    c.curveType = 'chordal';
    return c;
  })[0];

  // Interaction state
  const [dragged, drag] = useState<false | THREE.Vector3>(false);
  const [hovered, hover] = useState(false);

  // Responsive sizing
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmall(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return (): void => window.removeEventListener('resize', handleResize);
  }, []);

  // Connect physics joints
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.45, 0]
  ]);

  // Update cursor based on hover/drag state
  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => {
        document.body.style.cursor = 'auto';
      };
    }
  }, [hovered, dragged]);

  // Animation loop
  useFrame((state, delta) => {
    if (dragged && typeof dragged !== 'boolean') {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z
      });
    }
    if (fixed.current) {
      [j1, j2].forEach(ref => {
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      if (band.current) {
        band.current.geometry.setPoints(curve.getPoints(32));
      }
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type={'fixed' as RigidBodyProps['type']} />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps} type={'dynamic' as RigidBodyProps['type']}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps} type={'dynamic' as RigidBodyProps['type']}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps} type={'dynamic' as RigidBodyProps['type']}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? ('kinematicPosition' as RigidBodyProps['type']) : ('dynamic' as RigidBodyProps['type'])}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e: any) => {
              e.target.releasePointerCapture(e.pointerId);
              drag(false);
            }}
            onPointerDown={(e: any) => {
              e.target.setPointerCapture(e.pointerId);
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));
            }}
          >
            {/* Card mesh with microphone texture */}
            {nodes.card && nodes.card.geometry ? (
              <mesh geometry={nodes.card.geometry}>
                <meshPhysicalMaterial
                  map={microphoneTexture || materials.base?.map}
                  map-anisotropy={16}
                  clearcoat={1}
                  clearcoatRoughness={0.15}
                  roughness={0.3}
                  metalness={0.1}
                />
              </mesh>
            ) : (
              <mesh>
                <boxGeometry args={[1.6, 2.25, 0.02]} />
                <meshPhysicalMaterial
                  map={microphoneTexture}
                  color="#f8f9fa"
                  clearcoat={1}
                  clearcoatRoughness={0.15}
                  roughness={0.3}
                  metalness={0.1}
                />
              </mesh>
            )}

            {/* Clip and clamp meshes - fallback if not loaded */}
            {nodes.clip && nodes.clip.geometry && materials.metal ? (
              <>
                <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
                <mesh geometry={nodes.clamp?.geometry} material={materials.metal} />
              </>
            ) : (
              <mesh position={[0, 1.125, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.1, 16]} />
                <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
              </mesh>
            )}
          </group>
        </RigidBody>
      </group>

      {/* Lanyard band */}
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color={lanyardTexture ? 'white' : '#3b82f6'}
          depthTest={false}
          resolution={isSmall ? [1000, 2000] : [1000, 1000]}
          useMap={lanyardTexture ? 1 : 0}
          map={lanyardTexture}
          repeat={[-3, 1]}
          lineWidth={1}
        />
      </mesh>
    </>
  );
}

// Preload assets for faster initial render
useGLTF.preload('/assets/lanyard/card.glb');
useTexture.preload('/assets/lanyard/lanyard.png');
useTexture.preload('/assets/lanyard/microphone-card.png');
