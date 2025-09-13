import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import { useMemo, useEffect, useState } from 'react';

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
    const [trajData, setTrajData] = useState(null);

    // Retrieve data from URL endpoint
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`trajectory/3d-view`);
                if (!response.ok) {
                    throw new Error('Failed to fetch trajectory data.');
                }
                const data = await response.json();
                setTrajData(data);
            } catch (err) {
                console.log(err.message);
            }
        };

        fetchData();
    }, [])

    // Optimizes performance by using memoization
    const prepared = useMemo(() => {
        // Check if input data exists
        if (!trajData?.features?.length) return null;

        let minLon = Infinity, maxLon = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;
        let minTime = Infinity, maxTime = -Infinity;

        // Loop through every feature 
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

        const center = { lon: (minLon + maxLon) / 2, lat: (minLat + maxLat) / 2};
        const startTimeMs = minTime;
        const timeRangeSec = (maxTime - minTime) / 1000;

        // Convert each feature into an array of points
        const lines = trajData.features.map((f, i) => {
            const points = f.geometry.coordinates.map(c => toXYZ(c, center, startTimeMs));
            return {id : i, points};
        });

        // 3D box in meters
        const size = {
            x : (maxLon - minLon) * 111000 || 1000,
            y : (maxLat - minLat) * 111000 || 1000,
            z: timeRangeSec || 1000
        };

        return { lines, size, center, timeRangeSec };

    }, [trajData]);

    if (!prepared) return <div>Loading 3D visualization</div>;

    const {lines, size, _, timeRangeSec} = prepared;

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas camera={{ position: [0, -size.y * 1.5, size.z * 2], fov: 50 }}>
                <OrbitControls enablePan enableZoom enableRotate />
                {/* Transparent region bounds */}
                <mesh position={[0, 0, size.z / 2]}>
                    <boxGeometry args={[Math.max(size.x, 1000), Math.max(size.y, 1000), Math.max(size.z, 1000)]} />
                    <meshBasicMaterial color="#3399ff" wireframe />
                </mesh>

                {/* Plot trajectories as lines in 3D space */}
                {lines.map(({ id, points }) => (
                    <Line 
                        key={id}
                        points={points}
                        color={['#ff4d4d', '#4d79ff', '#33cc66', '#ffd11a', '#00e5ff', '#ff66ff', '#ff9933', '#99ff33'][id % 8]}
                        lineWidth={3}
                    />
                ))}
            </Canvas>

            <div style={{ position: 'absolute', top: 12, left: 12, color: 'white' }}>
                <div style={{ fontWeight: 600}}>3D Trajectory Viewer</div>
                <div>Abstract 3D representation (Orbit to rotate/zoom)</div>
            </div>
        </div>
    );
}

export default Trajectory3DViewer;