import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import { useMemo, useEffect, useState, useRef } from 'react';
import './trajectory3DViewer.css';

// Converts (lon, lat, ts) coordinate pairs into 3D coordinates
const toXYZ = (coord, center, startTimeMs) => {
    const [lon, lat, isoTime] = coord;

    // Convert difference in degrees to meters
    const meterPerDegree = 111000;
    const x = (lon - center.lon) * meterPerDegree;
    const y = (lat - center.lat) * meterPerDegree;
    const z = (new Date(isoTime).getTime() - startTimeMs) / 1000;
    return [x, y, z];
}

const Trajectory3DViewer = () => {
    // Track if current window is in fullscreen mode
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Provides access to the actual div element for fullscreen
    const containerRef = useRef(null);

    // Synchronize React component's state with actual screen status
    useEffect(() => {
        // Setup function
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Cleanup function: run at re-mount
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Function that executes entering and exiting fullscreen
    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            try {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } catch (err) {
                console.error('Error attempting to enable fullscreen:', err);
            }
        } else {
            //Exit fullscreen
            try {
                await document.exitFullscreen();
                setIsFullscreen(false);
            } catch (err) {
                console.error()
            }
        }
    };

    
    return (
        <div ref={containerRef} className={`container ${isFullscreen ? 'fullscreen' : ''}` }>
            <Canvas camera={{ position: [200, -150, 200], fov: 50 }}>
                <color attach="background" args={['#1a1a1a']} />

                <ambientLight intensity={0.5} />
                <directionalLight position={[200, 200, 100]} intensity={1} />
                <pointLight position={[-150, -150, -150]} intensity={0.5} />
                <OrbitControls enablePan enableZoom enableRotate />

                <group>
                    {/* X axis: horizontal red rod  */}
                    <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[1, 1, 100]} />
                        <meshStandardMaterial color="#ff0000" />
                    </mesh>

                    {/* Y axis: vertical green rod */}
                    <mesh position={[0, 0, 0]} >
                        <cylinderGeometry args={[1, 1, 100]} />
                        <meshStandardMaterial color="#00ff00" />
                    </mesh>

                    {/* Z axis: blue depth rod */}
                    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[1, 1, 100]} />
                        <meshStandardMaterial color="#0000ff" />
                    </mesh>
                </group>

                {/* Axis labels */}
                <Text position={[60, 0, 0]} fontSize={20} color="red">
                    X
                </Text>
                <Text position={[0, 60, 0]} fontSize={20} color="green">
                    Y
                </Text>
                <Text position={[0, 0, 60]} fontSize={20} color="blue">
                    Z
                </Text>

                {/* Transparent region bounds */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[100, 100, 100]} />
                    <meshStandardMaterial color="#3399ff" wireframe />
                </mesh>

                {/* Axis label */}
                {/* <Text position={[0, 0, -30]} fontSize={14} color="yellow" outlineColor="black" outlineWidth={0.02}>
                    X: Longitude, Y: Latitude, Z: Time
                </Text> */}

                {/* Time ticks in 10 steps */}
                {/* {Array.from({ length: 11 }).map((_, i) => {
                    const z = (i / 10) * timeRangeSec;
                    return (
                        <Text key={i} position={[-size.x * 0.55, -size.y * 0.55, z]} fontSize={12} color="white"
                        outlineColor="black" outlineWidth={0.02}>
                            {Math.round(z / 60)} min
                        </Text>
                    );
                })} */}

            </Canvas>

            <div className='overlay'>
                <div className='title'>3D Trajectory Viewer</div>
                <div className='subtitle'>Abstract 3D representation (Orbit to rotate/zoom)</div>
            </div>

            {/* Fullscreen button */}
            <button className='fullscreen-button' onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                    {isFullscreen ? '⤓' : '⤢'}
            </button>
        </div>
    );
}

export default Trajectory3DViewer;