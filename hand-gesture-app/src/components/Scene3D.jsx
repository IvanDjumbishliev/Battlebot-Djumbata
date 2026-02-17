import React, { useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

const Line = ({ points, color, size, isNeon }) => {
    const geometry = useMemo(() => {
        const pts = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        return new THREE.BufferGeometry().setFromPoints(pts);
    }, [points]);

    return (
        <line geometry={geometry}>
            <lineBasicMaterial
                color={color}
                linewidth={size}
                toneMapped={false}
            />
        </line>
    );
};

const ActiveLine = ({ points, color, size }) => {
    const geometry = useMemo(() => {
        const pts = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        return new THREE.BufferGeometry().setFromPoints(pts);
    }, [points]);

    return (
        <line geometry={geometry}>
            <lineBasicMaterial color={color} linewidth={size} toneMapped={false} />
        </line>
    );
};

const Scene3D = forwardRef(({ lines, activeLine, brushColor, brushSize, isNeon, showGrid, autoRotate }, ref) => {
    const groupRef = useRef();

    useImperativeHandle(ref, () => ({
        exportScene: () => {
            if (!groupRef.current) return;
            const exporter = new GLTFExporter();
            exporter.parse(groupRef.current, (result) => {
                const output = JSON.stringify(result, null, 2);
                const blob = new Blob([output], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `air-draw-model-${Date.now()}.glb`;
                link.click();
            }, { binary: true });
        }
    }));

    return (
        <div className="scene-3d-container" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <Canvas gl={{ toneMapping: THREE.NoToneMapping }}>
                <PerspectiveCamera makeDefault position={[0, 0, 15]} />
                <OrbitControls
                    makeDefault
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    autoRotate={autoRotate}
                    autoRotateSpeed={2.0}
                />

                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                <group ref={groupRef}>
                    {lines.map((line, index) => (
                        <Line key={index} points={line.points} color={line.color} size={line.size} isNeon={isNeon} />
                    ))}
                    {activeLine.length > 0 && (
                        <ActiveLine points={activeLine} color={brushColor} size={brushSize} />
                    )}
                </group>

                {showGrid && <gridHelper args={[20, 20, 0x555555, 0x333333]} rotation={[0, 0, 0]} />}

                {isNeon && (
                    <EffectComposer>
                        <Bloom
                            intensity={1.5}
                            luminanceThreshold={0}
                            luminanceSmoothing={0.9}
                            height={300}
                        />
                    </EffectComposer>
                )}
            </Canvas>
        </div>
    );
});

export default Scene3D;
