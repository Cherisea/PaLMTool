import { Canvas } from '@react-three/fiber';
import { OribitControls, Line, Text } from '@react-three/drei';
import { useMemo } from 'react';

// Converts (lon, lat, ts) coordinate pairs into 3D coordinates
function toXYZ(coord, center, startTimeMs) {
    const [lon, lat, isoTime] = coord;

    // Convert difference in degrees to meters
    const meterPerDegree = 111000;
    const x = (lon - center.lon) * meterPerDegree;
    const y = (lat - center.lat) * meterPerDegree;
    const z = (new Date(isoTime).getTime() - startTimeMs) / 1000;
    return [x, y, z];
}

export default function Trajectory3DViewer({trajData}) {
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

        const size = {
            x : (maxLon - minLon) * 111000 || 1000,
            y : (maxLat - minLat) * 111000 || 1000,
            z: timeRangeSec || 1000
        };

        return { lines, size, center, timeRangeSec };

    }, [trajData]);

    if (!prepared) return <div>Loading 3D visualization</div>;
};