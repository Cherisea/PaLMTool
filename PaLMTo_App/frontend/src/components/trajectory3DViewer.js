import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import { useMemo, useEffect, useState, useRef } from 'react';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';

import { isoToHour, toXYZ, createGridLines} from './trajectory3DUtil';
import './trajectory3DViewer.css';

const meterPerDegree = 111000;  // Meters per geographical degree(estimate)
const scaleFactor = 0.01;   // 1 km physical distance equals to 10 visual units
const gridLineStep = 5;     // One grid line every 5 visual units

// Display dynamically retrieved time ticks on z axis
const createTimeTicks = (count, color, start) => {
    return Array.from({ length: count }).map((_, i) => {
        return (
            <Text 
                key={`time-${i}`}
                position={[-5, -5, i * gridLineStep]}
                fontSize={8}
                color={color}
                outlineColor="blue"
                outlineWidth={0.02}
            >
                {i+start}:00
            </Text>
        )
    })
}

// Fullscreen utility function
const useFullscreen = (containerRef) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

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

    return { isFullscreen, toggleFullscreen };
}

// Process input trajectory data
const useTrajData = (trajData) => {
    return useMemo(() => {
        if (!trajData?.features?.length) return null;
        
        // Initialize values we need
        let minLon = Infinity, maxLon = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;
        let minStart = Infinity, maxStart = -Infinity;

        for (const f of trajData.features) {
            const startTime = isoToHour(f.properties.start_time);
            const endTime = isoToHour(f.properties.end_time);

            minStart = Math.min(minStart, startTime);
            maxStart = Math.max(maxStart, endTime);
            for (const [lon, lat] of f.geometry.coordinates) {
                minLon = Math.min(minLon, lon);
                maxLon = Math.max(maxLon, lon);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
            }
        }

        minStart = Math.floor(minStart)
        maxStart = Math.ceil(maxStart)

        // Range of longitude and latitude in meters
        const lonRange = Math.floor((maxLon - minLon) * meterPerDegree);
        const latRange = Math.floor((maxLat - minLat) * meterPerDegree);
        const timeRange = maxStart - minStart
        const origin = {lon: minLon, lat: minLat};

        const lines = trajData.features.map((f, i) => {
            const points = f.geometry.coordinates.map(coords => toXYZ(coords, origin, minStart));
            return {id: i, points};
        })

        return {lonRange, latRange, lines, timeRange, minStart}
    }, [trajData])
};

// Custom hook for retrieving data via URL endpoint
const useFetchTrajData = () => {
    const [trajData, setTrajData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,setError] = useState(null);

    // Fetch data from url endpoint
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/trajectory/3d-view`);
                if (!response.ok) {
                    throw new Error('Failed to fetch trajectory data.');
                }
                const data = await response.json();
                setTrajData(data);
                setError(null);
            } catch (err) {
                console.error(err.message);
                setError(err.message)
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [])

    return { trajData, loading, error };
}

const Trajectory3DViewer = () => {
    // Provides access to the actual div element for fullscreen
    const containerRef = useRef(null);

    // Utilize custom hooks
    const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
    const { trajData, loading, error } = useFetchTrajData();
    const prepared = useTrajData(trajData);
    
    if (loading) return <div>Loading 3D visualization</div>;
    if (error) return <div>Error: {error}</div>;
    if (!prepared) return <div>Loading 3D visualization</div>;

    const {lonRange, latRange, lines, timeRange, minStart} = prepared;
    const boxSize = [lonRange * scaleFactor, latRange * scaleFactor, timeRange * gridLineStep]

    return (
        <div ref={containerRef} className={`container ${isFullscreen ? 'fullscreen' : ''}` }>
            <Canvas camera={{ position: [50, -30, 50], fov: 50 }}>
                <color attach="background" args={['#1a1a1a']} />
                <OrbitControls enablePan enableZoom enableRotate />

                <ambientLight intensity={0.5} />
                <directionalLight position={[50, 50, 25]} intensity={1} />
                <pointLight position={[-25, -25, -25]} intensity={0.5} />

                {/* Grid lines every 5 visual unit(500m/1h) */}
                {createGridLines('x', Math.ceil(lonRange / 500) + 1, lonRange * scaleFactor, latRange * scaleFactor, "red")}
                {createGridLines('y', Math.ceil(latRange / 500) + 1, lonRange * scaleFactor, latRange * scaleFactor, "green")}
                {createGridLines('z-x', timeRange + 1, lonRange * scaleFactor, latRange * scaleFactor, "blue")}
                {createGridLines('z-y', timeRange + 1, lonRange * scaleFactor, latRange * scaleFactor, "blue")}

                {/* Axis labels */}
                <Text position={[150, 0, 0]} fontSize={10} color="red">
                    Longitude
                </Text>
                <Text position={[0, 60, 0]} fontSize={14} color="green">
                    Latitude
                </Text>
                {createTimeTicks(timeRange + 1, 'white', minStart)}

                {/* Transparent region bounds */}
                <mesh position={[lonRange * 0.005, latRange * 0.005, timeRange * 2.5]}>
                    <boxGeometry args={boxSize} />
                    <meshStandardMaterial color="#3399ff" wireframe />
                </mesh>

                {/* Plot trajectories as lines in 3D space */}
                {lines.map((line) => (
                    <Line 
                        key={line.id}
                        points={line.points}
                        lineWidth={3}
                        color={['#ff4d4d', '#4d79ff', '#33cc66', '#ffd11a', '#00e5ff', '#ff66ff', '#ff9933', '#99ff33'][line.id % 8]}
                    />
                ))}

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