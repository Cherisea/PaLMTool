import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text, ScreenSizer } from '@react-three/drei';
import { useMemo, useEffect, useState, useRef } from 'react';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import './trajectory3DViewer.css';

const timeBins = 48;    // Total bins in a day
const binSize = 24 * 60 * 60 / timeBins;    // Seconds per bin
const meterPerDegree = 111000;  // Meters per geographical degree(estimate)
const scaleFactor = 0.01;   // 1 km equals to 10 visual units
const averageSpeed = 1.4;   // Average walking speed 1.4 m/s

// Categorizes an ISO-formatted time to one of 48 bins on z axis
const timeToBin = (isoTime) => {
    const date = new Date(isoTime);
    const hours = date.getHours();
    const mins = date.getMinutes();
    const secs = date.getSeconds();
    const totalSecs = hours * 3600 + mins * 60 + secs;

    const dist = totalSecs * averageSpeed;
    return dist * scaleFactor;
}

// Converts (lon, lat, ts) coordinate pairs into 3D coordinates
const toXYZ = (coord, origin) => {
    const [lon, lat, isoTime] = coord;
    
    const x = Math.floor((lon - origin.lon) * meterPerDegree) * scaleFactor;
    const y = Math.floor((lat - origin.lat) * meterPerDegree) * scaleFactor;
    const z = timeToBin(isoTime);
    return [x, y, z];
}

const Trajectory3DViewer = () => {
    // Track if current window is in fullscreen mode
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Provides access to the actual div element for fullscreen
    const containerRef = useRef(null);

    // Stores retrieved trajectory data
    const [trajData, setTrajData] = useState(null);

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

    // Fetch data from url endpoint
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/trajectory/3d-view`);
                if (!response.ok) {
                    throw new Error('Failed to fetch trajectory data.');
                }
                const data = await response.json();
                setTrajData(data);
            } catch (err) {
                console.error(err.message);
            }
        };

        fetchData();
    }, [])

    // Prepare trajectory data for 3D rendering
    const prepared = useMemo(() => {
        if (!trajData?.features?.length) return null;
        
        // Initialize values we need
        let minLon = Infinity, maxLon = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;

        for (const f of trajData.features) {
            for (const [lon, lat] of f.geometry.coordinates) {
                minLon = Math.min(minLon, lon);
                maxLon = Math.max(maxLon, lon);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
            }
        }

        // Range of longitude and latitude in meters
        const lonRange = Math.floor((maxLon - minLon) * meterPerDegree);
        const latRange = Math.floor((maxLat - minLat) * meterPerDegree);
        const origin = {lon: minLon, lat: minLat};
        
        return {origin, lonRange, latRange}
    }, [trajData])

    if (!prepared) return <div>Loading 3D visualization</div>;

    const {origin, lonRange, latRange} = prepared;
    
    return (
        <div ref={containerRef} className={`container ${isFullscreen ? 'fullscreen' : ''}` }>
            <Canvas camera={{ position: [50, -30, 50], fov: 50 }}>
                <color attach="background" args={['#1a1a1a']} />
                <OrbitControls enablePan enableZoom enableRotate />

                <ambientLight intensity={0.5} />
                <directionalLight position={[50, 50, 25]} intensity={1} />
                <pointLight position={[-25, -25, -25]} intensity={0.5} />
                

                <group>
                    {/* X axis: horizontal red rod  */}
                    <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.5, 0.5, 50]} />
                        <meshStandardMaterial color="#ff0000" />
                    </mesh>

                    {/* Y axis: vertical green rod */}
                    <mesh position={[0, 0, 0]} >
                        <cylinderGeometry args={[0.5, 0.5, 50]} />
                        <meshStandardMaterial color="#00ff00" />
                    </mesh>

                    {/* Z axis: blue depth rod */}
                    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.5, 0.5, 50]} />
                        <meshStandardMaterial color="#0000ff" />
                    </mesh>
                </group>

                {/* Grid lines every 1km (scaled down) in x axis */}
                {Array.from({ length: Math.ceil(lonRange / 1000) + 1 }).map((_, i) => (
                    <Line 
                        key={`x-${i}`}
                        points={[
                            [i * 10, 0, 0],
                            [i * 10, latRange * scaleFactor, 0]
                        ]}
                        color="white"
                        lineWidth={1}
                    />
                ))}

                {/* Grid lines every 1km (scaled down) in y axis */}
                {Array.from({ length: Math.ceil(latRange / 1000) + 1 }).map((_, i) => (
                    <Line 
                        key={`y-${i}`}
                        points={[
                            [0, i * 10, 0],
                            [lonRange * scaleFactor, i * 10, 0]
                        ]}
                        color="white"
                        lineWidth={1}
                    />
                ))}

                {/* Grid lines every 2.4 hours in z axis */}
                {Array.from({ length: timeBins / 10 + 1 }).map((_, i) => (
                    <Line 
                        key={`z-${i}`}
                        points={[
                            [0, 0, i * 10],
                            [lonRange * scaleFactor, 0, i * 10]
                        ]}
                        color="red"
                        lineWidth={1}
                    />
                ))}

                {/* Axis labels */}
                <Text position={[50, 0, 0]} fontSize={10} color="red">
                    Longitude
                </Text>
                <Text position={[0, 50, 0]} fontSize={14} color="green">
                    Latitude
                </Text>
                <Text position={[0, 0, 30]} fontSize={14} color="blue">
                    Time
                </Text>

                {/* Transparent region bounds */}
                <mesh position={[lonRange * 0.005, latRange * 0.005, timeBins * 0.5]}>
                    <boxGeometry args={[lonRange * scaleFactor, latRange * scaleFactor, timeBins]} />
                    <meshStandardMaterial color="#3399ff" wireframe />
                </mesh>

            </Canvas>

            <div className='overlay'>
                <div className='title'>3D Trajectory Viewer</div>
                <div className='subtitle'>Abstract 3D representation of trajectories (Orbit to rotate/zoom)</div>
            </div>

            {/* Fullscreen button */}
            <button className='fullscreen-button' onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                    {isFullscreen ? <FiMinimize2 size={20} /> : <FiMaximize2 size={20} />}
            </button>
        </div>
    );
}

export default Trajectory3DViewer;