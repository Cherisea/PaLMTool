import { Line, Text } from '@react-three/drei';
import { useMemo, useEffect, useState, useRef } from 'react';

const METER_PER_DEGREE = 111000;  // Meters per geographical degree(estimate)
const SCALE_FACTOR = 0.01;   // 100m per 1 visual unit 

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
        timeStep: 12,
        distanceUnit: 'm',
        distanceStep: 200,
        gridSpacing: 2
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
const toXYZ = (coord, origin, minStart) => {
    const [lon, lat, isoTime] = coord;
    
    // Visual units distance on x axis 
    const x = (lon - origin.lon) * METER_PER_DEGREE * SCALE_FACTOR;

    // Visual units distance on y axis
    const y = (lat - origin.lat) * METER_PER_DEGREE * SCALE_FACTOR;

    // Visual units distance on z axis adjusted by spacing(1h -> 10 visual units)
    const z = (isoToHour(isoTime) - minStart) * 10;
    return [x, y, z];
}

// Grid line creation function
const createGridLines = (axis, count, xrang, yrang, color="white", zoomLevel) => {
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

// Create and display time ticks based on current zoom level
const createTimeTicks = (count, color, start, zoomLevel) => {
    const timeUnit = zoomLevel.timeUnit;
    const timeStep = zoomLevel.timeStep;

    return Array.from({ length: count }).map((_, i) => {
        let displayValue;
        let position;

        if (timeUnit === 'hour') {
            displayValue = `${start + i}:00`;
            position=[-5, -5, i * zoomLevel.gridSpacing];
        } else if (timeUnit === 'minute') {
            const totalMins = start * 60 + i * timeStep;
            const hours = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            displayValue = `${hours}:${mins.toString().padStart(2, '0')}`;
            position = [-2, 2, i * zoomLevel.gridSpacing];
        }

        return (
            <Text 
                key={`time-${i}-${zoomLevel.name}`}
                position={position}
                fontSize={zoomLevel.name === 'Detail' ? 4 : 8}
                color={color}
                outlineColor="blue"
                outlineWidth={0.02}
            >
                {displayValue}
            </Text>
        )
    })
}

// ================== Custom hooks =====================
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

// Retrieve trajectory data via API endpoint
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

// Process input trajectory data with optional filters
const useTrajData = (trajData, filters = null) => {
    return useMemo(() => {
        if (!trajData?.features?.length) return null;
        
        // Initialize values we need
        let minLon = Infinity, maxLon = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;
        let minStart = Infinity, maxEnd = -Infinity;

        for (const f of trajData.features) {
            const startTime = isoToHour(f.properties.start_time);
            const endTime = isoToHour(f.properties.end_time);

            minStart = Math.min(minStart, startTime);
            maxEnd = Math.max(maxEnd, endTime);
            for (const [lon, lat] of f.geometry.coordinates) {
                minLon = Math.min(minLon, lon);
                maxLon = Math.max(maxLon, lon);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
            }
        }
        
        // Minimum start time in hours rounded down
        minStart = Math.floor(minStart)

        // Maximum end time in hours rounded up
        maxEnd = Math.ceil(maxEnd)

        const lonRange = Math.floor((maxLon - minLon) * METER_PER_DEGREE);
        const latRange = Math.floor((maxLat - minLat) * METER_PER_DEGREE);
        const timeRange = maxEnd - minStart;

        // Store original bounds for filtering
        const originalBounds = {
            minLon, maxLon,
            minLat, maxLat,
            minStart, maxEnd
        };

        // Return unfiltered data if filters are not set
        if (!filters) {
            const origin = {lon: minLon, lat: minLat};
            const lines = trajData.features.map((f, i) => {
                const points = f.geometry.coordinates.map(coords => toXYZ(coords, origin, minStart));
                return {id: i, points};
            })
    
            return {lonRange, latRange, lines, timeRange, minStart, originalBounds};
        }

        // Apply filters if provided
        let filteredFeatures = trajData.features;
        // Trajectory-level filtering
        filteredFeatures = trajData.features.filter(f => {
            const startTime = isoToHour(f.properties.start_time);
            const endTime = isoToHour(f.properties.end_time);

            // Temporal filter
            if (startTime > filters.timeRange[1] || endTime < filters.timeRange[0]) {
                return false;
            }

            // Spatial filter -- preserve a trip if at least one point is within bounds
            return f.geometry.coordinates.some(([lon, lat]) => {
                return lon >= filters.lonRange[0] && lon <= filters.lonRange[1] &&
                        lat >= filters.latRange[0] && lat <= filters.latRange[1];
            });
        });

        // Point-level filtering
        filteredFeatures = filteredFeatures.map(f => ({
            ...f,
            geometry: {
                ...f.geometry,
                coordinates: f.geometry.coordinates.filter(([lon, lat, time]) => {
                    const pointTime = isoToHour(time);
                    return lon >= filters.lonRange[0] && lon <= filters.lonRange[1] &&
                            lat >= filters.latRange[0] && lat <= filters.latRange[1] &&
                            pointTime >= filters.timeRange[0] && pointTime <= filters.timeRange[1];
                })
            }
        })).filter(f => f.geometry.coordinates.length > 0)      // Discard trajectory that doesn't have any point left
        
        // Return original bounds if no data remains after filtering
        if (filteredFeatures.length === 0) {
            return {
                lonRange: 0, latRange: 0, lines: [],
                timeRange: 0, minStart, originalBounds
            };
        }

        // Return filtered bounds
        let filteredMinLon = Infinity, filteredMaxLon = -Infinity;
        let filteredMinLat = Infinity, filteredMaxLat = -Infinity;

        for (const f of filteredFeatures) {
            for (const [lon, lat, _] of f.geometry.coordinates) {
                filteredMinLon = Math.min(filteredMinLon, lon);
                filteredMaxLon = Math.max(filteredMaxLon, lon)
                filteredMinLat = Math.min(filteredMinLat, lat);
                filteredMaxLat = Math.max(filteredMaxLat, lat);
            }
        }

        // Longitude and latitude range in meters (rounded down)
        const filteredLonRange = Math.floor((filteredMaxLon - filteredMinLon) * METER_PER_DEGREE);
        const filterdLatRange = Math.floor((filteredMaxLat - filteredMinLat) * METER_PER_DEGREE);

        // Time range in hours
        const filteredTimeRange = filters.timeRange[1] - filters.timeRange[0];
        const filteredOrigin = {lon: filteredMinLon, lat: filteredMinLat};

        const filteredLines = filteredFeatures.map((f, i) => {
            const points = f.geometry.coordinates.map(coords => toXYZ(coords, filteredOrigin, filters.timeRange[0]));
            return {id: i, points};
        })

        return {
            lonRange: filteredLonRange, 
            latRange: filterdLatRange, 
            lines: filteredLines, 
            timeRange: filteredTimeRange, 
            minStart: filters.timeRange[0]}
    }, [trajData, filters])
};

// Track camera distance from the origin
const useCameraDistance = () => {
    const [cameraDistance, setCameraDistance] = useState(100);
    const cameraRef = useRef();

    useEffect(() => {
        const interval = setInterval(() => {
            if (cameraRef.current) {
                const distance = cameraRef.current.position.length();
                setCameraDistance(distance);
            }
        }, 100);    // Updates every 100ms

        return () => clearInterval(interval);
    }, []);

    return { cameraDistance, cameraRef };
}

// Hook for managing trajectory filters
const use3DFilters = (originalBounds) => {
    const [filters, setFilters] = useState(null);
    const [isFilterActive, setIsFilterActive] = useState(false);

    // Initialize filters when bounds are visible
    useEffect(() => {
        if (originalBounds && !filters) {
            setFilters({
                timeRange: [originalBounds.minStart, originalBounds.maxEnd],
                lonRange: [originalBounds.minLon, originalBounds.maxLon],
                latRange: [originalBounds.minLat, originalBounds.maxLat]
            });
        }
    }, [originalBounds, filters]);

    // Update filters when they are adjusted
    const updateFilters = (type, range) => {
        setFilters(prev => ({
            ...prev,
            [type]: range
        }));
    };

    // Reset filters
    const resetFilters = () => {
        if (originalBounds) {
            setFilters({
                timeRange: [originalBounds.minStart, originalBounds.maxEnd],
                lonRange: [originalBounds.minLon, originalBounds.maxLon],
                latRange: [originalBounds.minLat, originalBounds.maxLat]
            });
            setIsFilterActive(false);
        }
    };

    return {
        filters,
        isFilterActive,
        setIsFilterActive,
        updateFilters,
        resetFilters,
    };
};


export {SCALE_FACTOR, getZoomLevel, createGridLines, createTimeTicks,
    useTrajData, useFullscreen, useFetchTrajData, useCameraDistance,
    use3DFilters};