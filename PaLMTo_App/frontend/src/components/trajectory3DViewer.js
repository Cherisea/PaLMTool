import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import { useMemo, useEffect, useState, useRef } from 'react';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import './trajectory3DViewer.css';

const meterPerDegree = 111000;  // Meters per geographical degree(estimate)
const scaleFactor = 0.01;   // 1 km physical distance equals to 10 visual units
const gridLineStep = 5;     // One grid line every 5 visual units

// Categorizes an ISO-formatted time to one of 24 bins on z axis
const isoToHour = (isoTime) => {
    const date = new Date(isoTime);
    const hours = date.getHours();
    const mins = date.getMinutes();
    
    // Round result to one decimal place
    const hour = Math.floor((hours + mins / 60) * 10) / 10;

    return hour;
}

// Converts (lon, lat, ts) coordinate pairs into 3D coordinates
const toXYZ = (coord, origin) => {
    const [lon, lat, isoTime] = coord;
    
    const x = Math.floor((lon - origin.lon) * meterPerDegree * scaleFactor / gridLineStep);
    const y = Math.floor((lat - origin.lat) * meterPerDegree * scaleFactor / gridLineStep);
    const z = isoToHour(isoTime) * gridLineStep;
    return [x, y, z];
}

// Grid line creation function
const createGridLines = (axis, count, xrang, yrang, color="white") => {
    const getPoints = (i) => {
        switch (axis) {
            case 'x':
                return [[i * gridLineStep, 0, 0], [i * gridLineStep, yrang, 0]];
            case 'y':
                return [[0, i * gridLineStep, 0], [xrang, i * gridLineStep, 0]];
            case 'z-x':
                return [[0, 0, i * gridLineStep], [xrang, 0, i * gridLineStep]];
            case 'z-y':
                return [[0, 0, i * gridLineStep], [0, yrang, i * gridLineStep]];
        }
    }

    return Array.from({ length: count }).map((_, i) => (
        <Line 
            key={`${axis}-${i}`}
            points={getPoints(i)}
            color={color}
            lineWidth={1}
        />
    ))
}


// Display time ticks on z axis
const createTimeTicks = (count, color) => {
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
                {i}:00
            </Text>
        )
    })
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

        // Range of longitude and latitude in meters
        const lonRange = Math.floor((maxLon - minLon) * meterPerDegree);
        const latRange = Math.floor((maxLat - minLat) * meterPerDegree);
        const timeRange = Math.ceil(maxStart) - Math.floor(minStart)
        const origin = {lon: minLon, lat: minLat};

        const lines = trajData.features.map((f, i) => {
            const points = f.geometry.coordinates.map(coords => toXYZ(coords, origin));
            return {id: i, points};
        })

        return {lonRange, latRange, lines, timeRange}
    }, [trajData])

    if (!prepared) return <div>Loading 3D visualization</div>;

    const {lonRange, latRange, lines, timeRange} = prepared;
    const boxSize = [lonRange * scaleFactor, latRange * scaleFactor, timeRange * gridLineStep]

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
                {createTimeTicks(timeRange + 1, 'white')}

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