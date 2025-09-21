

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

export {ZOOM_LEVELS, getZoomLevel, isoToHour};