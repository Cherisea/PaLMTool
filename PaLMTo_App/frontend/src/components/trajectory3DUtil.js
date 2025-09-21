import { Line } from '@react-three/drei';

const meterPerDegree = 111000;  // Meters per geographical degree(estimate)
const scaleFactor = 0.01;   // 100m per 1 visual unit 

// Dynamic reference system configuration
const ZOOM_LEVELS = [
    {
        name: 'Overview',
        minDistance: 200,   // Camera distance
        maxDistance: Infinity,
        timeUnit: 'hour',
        timeStep: 1,        //Increment between consecutive time ticks
        distanceUnit: 'km',
        distanceStep: 1,    // Increment between consecutive x/y ticks
        gridSpacing: 10     // Grid units per grid line
    },
    {
        name: 'Regional',
        minDistance: 100,
        maxDistance: 200,
        timeUnit: 'minute',
        timeStep: 30,
        distanceUnit: 'm',
        distanceStep: 500,
        gridSpacing: 5
    },
    {
        name: 'Local',
        minDistance: 50,
        maxDistance: 100,
        timeUnit: 'minute',
        timeStep: 10,
        distanceUnit: 'm',
        distanceStep: 100,
        gridSpacing: 2
    },
    {
        name: 'Detail',
        minDistance: 0,
        maxDistance: 50,
        timeUnit: 'minute',
        timeStep: 1,
        distanceUnit: 'm',
        distanceStep: 10,
        gridSpacing: 0.5
    }
]

// Auto select zoom level based on camera distance
const getZoomLevel = (cameraDistance) => {
    for (const level of ZOOM_LEVELS) {
        if (cameraDistance >= level.minDistance && cameraDistance < level.maxDistance) {
            return level;
        }
    }

    return ZOOM_LEVELS[0];  // Defaults to overview
}

// Converts an ISO-formatted time to hours with one decimal place
const isoToHour = (isoTime) => {
    const date = new Date(isoTime);
    const hours = date.getHours();
    const mins = date.getMinutes();
    
    // Round result to one decimal place
    const hour = Math.floor((hours + mins / 60) * 10) / 10;

    return hour;
}

// Converts (lon, lat, ts) coordinate pairs into 3D coordinates with dynamic scaling
const toXYZ = (coord, origin, minStart, zoomLevel=ZOOM_LEVELS[1]) => {
    const [lon, lat, isoTime] = coord;
    
    // Visual units distance on x axis 
    const x = (lon - origin.lon) * meterPerDegree * scaleFactor;

    // Visual units distance on y axis
    const y = (lat - origin.lat) * meterPerDegree * scaleFactor;

    // Visual units distance on z axis adjusted by spacing
    const z = (isoToHour(isoTime) - minStart) * zoomLevel.gridSpacing;
    return [x, y, z];
}

// Grid line creation function
const createGridLines = (axis, count, xrang, yrang, color="white", zoomLevel=ZOOM_LEVELS[1]) => {
    const getPoints = (i) => {
        const spacing = zoomLevel.gridSpacing;
        switch (axis) {
            case 'x':
                return [[i * spacing, 0, 0], [i * spacing, yrang, 0]];
            case 'y':
                return [[0, i * spacing, 0], [xrang, i * spacing, 0]];
            case 'z-x':
                return [[0, 0, i * spacing], [xrang, 0, i * spacing]];
            case 'z-y':
                return [[0, 0, i * spacing], [0, yrang, i * spacing]];
        }
    }

    return Array.from({ length: count }).map((_, i) => (
        <Line 
            key={`${axis}-${i}-${zoomLevel.name}`}
            points={getPoints(i)}
            color={color}
            lineWidth={1}
        />
    ))
}

export {ZOOM_LEVELS, getZoomLevel, isoToHour, toXYZ, createGridLines};