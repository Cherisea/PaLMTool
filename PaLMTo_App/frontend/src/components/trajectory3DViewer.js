import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import { useMemo, useEffect, useState, useRef } from 'react';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import './trajectory3DViewer.css';

const timeBins = 24;    // Total bins in a day
const meterPerDegree = 111000;  // Meters per geographical degree(estimate)
const scaleFactor = 0.01;   // 1 km physical distance equals to 10 visual units
const gridLineStep = 5;     // One grid line every 5 visual units

// Categorizes an ISO-formatted time to one of 24 bins on z axis
const timeToBin = (isoTime) => {
    const date = new Date(isoTime);
    const hours = date.getHours();
    const mins = date.getMinutes();
    
    // Round result to one decimal place
    const bin = Math.floor((hours + mins / 60) * 10) / 10;

    return bin;
}

// Converts (lon, lat, ts) coordinate pairs into 3D coordinates
const toXYZ = (coord, origin) => {
    const [lon, lat, isoTime] = coord;
    
    const x = Math.floor((lon - origin.lon) * meterPerDegree * scaleFactor / gridLineStep);
    const y = Math.floor((lat - origin.lat) * meterPerDegree * scaleFactor / gridLineStep);
    const z = timeToBin(isoTime);
    return [x, y, z];
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

    // Grid line creation function
    const createGridLines = (axis, count, color="white") => {
        const getPoints = (i) => {
            switch (axis) {
                case 'x':
                    return [[i * gridLineStep, 0, 0], [i * gridLineStep, latRange * scaleFactor, 0]];
                case 'y':
                    return [[0, i * gridLineStep, 0], [lonRange * scaleFactor, i * gridLineStep, 0]];
                case 'z-x':
                    return [[0, 0, i * gridLineStep], [lonRange * scaleFactor, 0, i * gridLineStep]];
                case 'z-y':
                    return [[0, 0, i * gridLineStep], [0, latRange * scaleFactor, i * gridLineStep]];
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

    if (!prepared) return <div>Loading 3D visualization</div>;

    const {origin, lonRange, latRange} = prepared;
    const boxSize = [lonRange * scaleFactor, latRange * scaleFactor, timeBins * gridLineStep]

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
                {createGridLines('x', Math.ceil(lonRange / 500) + 1, "red")}
                {createGridLines('y', Math.ceil(latRange / 500) + 1, "green")}
                {createGridLines('z-x', timeBins + 1, "blue")}
                {createGridLines('z-y', timeBins + 1, "blue")}

                {/* Axis labels */}
                <Text position={[150, 0, 0]} fontSize={10} color="red">
                    Longitude
                </Text>
                <Text position={[0, 60, 0]} fontSize={14} color="green">
                    Latitude
                </Text>
                {createTimeTicks(timeBins + 1, 'white')}

                {/* Transparent region bounds */}
                <mesh position={[lonRange * 0.005, latRange * 0.005, timeBins * 2.5]}>
                    <boxGeometry args={boxSize} />
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