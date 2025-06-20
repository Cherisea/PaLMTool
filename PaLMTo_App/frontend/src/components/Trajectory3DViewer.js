import React, { useEffect, useState } from 'react';
import * as Cesium from 'cesium';

const Trajectory3DViewer = () => {
    // State variable for 3D trajectory data
    const [trajData, setTrajData] = useState(null);

    // State variable indicating status of data request
    const [loading, setLoading] = useState(true);

    // State variable for error messages
    const [error, setError] = useState(null);

    // Retrieve data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`trajectory/analyze`);
                if (!response.ok) {
                    throw new Error('Failed to fetch trajectory data.');
                }
                const data = await response.json();
                setTrajData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [])

    // Cesium visualization
    useEffect(() => {
        if (!trajData || !trajData.features.length) return;

        let viewer = null;

        const initializeCesium = async () => {
            try {
                const terrainProvider = await Cesium.createWorldTerrainAsync();

                const viewer = new Cesium.Viewer('cesiumContainer', {
                    terrainProvider: terrainProvider,
                    timeline: true,
                    animation: true,
                    baseLayerPicker: false
                });

                // Get the overall time range
                let minTime = null;
                let maxTime = null;

                trajData.features.forEach(feature => {
                    const startTime = Cesium.JulianDate.fromIso8601(feature.properties.start_time);
                    const endTime = Cesium.JulianDate.fromIso8601(feature.properties.end_time);

                    if (!minTime || Cesium.JulianDate.compare(startTime, minTime) < 0 ) {
                        minTime = startTime
                    }

                    if (!maxTime || Cesium.JulianDate.compare(endTime, maxTime) > 0) {
                        maxTime = endTime
                    }
                });

                // Create animated trajectory path with timestamped coord pairs
                trajData.feature.forEach((feature, index) => {
                    const coords = feature.geometry.coordinates;

                    // Create timed position
                    const timeStampedPositions = coords.map(coord => ({
                        time: Cesium.JulianDate.fromIso8601(coord[2]),
                        position: Cesium.Cartesian3.fromDegrees(coord[0], coord[1], 0)
                    }));
                    
                    // Create a position property that adds samples between points
                    const positionProperty = new Cesium.SampledPositionProperty();
                    timeStampedPositions.forEach(({ time, position}) => {
                        positionProperty.addSample(time, position);
                    });

                    // Add trajectory path as an entity
                    viewer.entities.add({
                        availability: new Cesium.TimeIntervalCollection([
                            new Cesium.TimeInterval({
                                start: timeStampedPositions[0].time,
                                stop: timeStampedPositions[timeStampedPositions.length - 1].time
                            })
                        ]),
                        position: positionProperty,
                        path: {
                            resolution: 1, // Sampling frequency for trails in second
                            material: new Cesium.PolylineGlowMaterialProperty({     // Glowing line effect
                                glowPower: 0.2,     // Intensity
                                color: Cesium.Color.fromRandom({ alpha: 1.0 })
                            }),
                            width: 3
                        },
                        point: {
                            pixelSize: 8,
                            color: Cesium.Color.fromRandom({ alpha: 1.0 })
                        }
                    });

                })

                // Set up the clock
                viewer.clock.startTime = minTime;
                viewer.clock.stopTime = maxTime;
                viewer.clock.currentTime = minTime.clone();
                viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;  // Play once and stop at the end
                viewer.clock.multiplier = 1;    // Playback speed

                // Camera position: all trajectories are visible
                viewer.zoomTo(viewer.entities);

            } catch (error) {
                console.error("Failed to initialize Cesium viewer: ", error);
                setError('Failed to load 3D visualization');
            }
        };
        
        initializeCesium()

        return () => {
            if (viewer) {
                viewer.destory();
            }
        };

    }, [trajData]);

    if (loading) return <div>Loading 3D Visualization</div>;
    if (error) return <div>Error: {error} </div>;
    return <div id='cesiumContainer'  style={{ width: '100%', height: '100vh' }}/>;
};

export default Trajectory3DViewer;