import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import { useMemo, useEffect, useState, useRef } from 'react';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
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
        let minTime = Infinity, maxTime = -Infinity;

        for (const f of trajData.features) {
            const start_ms = new Date(f.properties.start_time).getTime();
            const end_ms = new Date(f.properties.end_time).getTime();
            minTime = Math.min(minTime, start_ms);
            maxTime = Math.max(maxTime, end_ms);

            for (const [lon, lat] of f.geometry.coordinates) {
                minLon = Math.min(minLon, lon);
                maxLon = Math.max(maxLon, lon);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
            }
        }

        // Range of longitude and latitude in meters
        const lonRange = Math.floor((maxLon - minLon) * 111000);
        const latRange = Math.floor((maxLat - minLat) * 111000);
        const origin = {lon: minLon, lat: minLat};

        // Total bins in a day
        const timeBins = 48;

        // Milliseconds per bin
        const binSize = 24 * 60 * 60 * 1000 / timeBins;

        console.log("Longitude range: ", lonRange);
        console.log("Latitude range: ", latRange);
        console.log("Number of time bins: ", timeBins)
        console.log("Bin size (minutes):", binSize / (60 * 1000));
        
        return {origin, lonRange, latRange, timeBins}
    }, [trajData])
    
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
                <Text position={[60, 0, 0]} fontSize={14} color="red">
                    Longitude
                </Text>
                <Text position={[0, 60, 0]} fontSize={14} color="green">
                    Latitude
                </Text>
                <Text position={[0, 0, 60]} fontSize={14} color="blue">
                    Time
                </Text>

                {/* Transparent region bounds */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[100, 100, 100]} />
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