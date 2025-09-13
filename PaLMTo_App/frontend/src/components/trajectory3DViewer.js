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
