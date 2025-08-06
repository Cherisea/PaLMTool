import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';

const Trajectory3DViewer = () => {
    // State variable for 3D trajectory data
    const [trajData, setTrajData] = useState(null);

    // State variable indicating status of data request
    const [loading, setLoading] = useState(true);

    // State variable for error messages
    const [error, setError] = useState(null);

    // State variable for persistent reference of Cesium viewer instance
    const viewerRef = useRef(null);

    // Retrieve data
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
                Cesium.Ion.defaultAccessToken = null;
                const terrainProvider = new Cesium.EllipsoidTerrainProvider();
                
                // Creates a 3D globe viewer
                viewer = new Cesium.Viewer('cesiumContainer', {
                    terrainProvider: terrainProvider,
                    timeline: true,
                    animation: true,
                    baseLayerPicker: false,
                    homeButton: false,
                    geocoder: false,
                    navigationHelpButton: false,
                    sceneModePicker: false,
                    fullscreenButton: true,
                    infoBox: false
                });

                // Assign a viewer reference for proper cleanup 
                viewerRef.current = viewer;

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
                trajData.features.forEach((feature, index) => {
                    const coords = feature.geometry.coordinates;

                    // Create timed position that substitute elapsed time for altitude
                    const timeStampedPositions = coords.map(coord => {
                        const time = new Date(coord[2]);

                        const timeInSecs = time.getTime() / 1000;
                        const startTimeSecs = new Date(feature.properties.start_time).getTime() / 1000;
                        const relativeTime = timeInSecs - startTimeSecs;
                        
                        return {
                            time: Cesium.JulianDate.fromIso8601(coord[2]),
                            position: Cesium.Cartesian3.fromDegrees(coord[0], coord[1], relativeTime)
                        };
                        
                    });
                    
                    // Create a position property that adds samples between points
                    const positionProperty = new Cesium.SampledPositionProperty();
                    timeStampedPositions.forEach(({ time, position}) => {
                        positionProperty.addSample(time, position);
                    });

                    // Genrate a unique color for each trajectory
                    const colors = [
                        Cesium.Color.RED,
                        Cesium.Color.BLUE,
                        Cesium.Color.GREEN,
                        Cesium.Color.YELLOW,
                        Cesium.Color.CYAN,
                        Cesium.Color.MAGENTA,
                        Cesium.Color.ORANGE,
                        Cesium.Color.LIME
                    ];
                    const color = colors[index % colors.length];

                    // Add trajectory path as an entity
                    viewer.entities.add({
                        name: `Trajectory ${index + 1}`,
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
                            width: 4,
                            show: true
                        },
                        point: {
                            pixelSize: 8,
                            color: color,
                            outlineColor: Cesium.Color.WHITE,
                            outlineWidth: 2
                        }
                    });

                });

                // Set up the clock
                viewer.clock.startTime = minTime;
                viewer.clock.stopTime = maxTime;
                viewer.clock.currentTime = minTime.clone();
                viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;  // Play once and stop at the end
                viewer.clock.multiplier = 1;    // Playback speed

                // Camera position: all trajectories are visible
                viewer.zoomTo(viewer.entities);

                // Add time axis labels
                const timeRange = Cesium.JulianDate.secondsDifference(maxTime, minTime);
                const timeStep = timeRange / 10;

                for (let i=0; i<=10; i++) {
                    const height = i * timeStep;

                    viewer.entities.add({
                        position: Cesium.Cartesian3.fromDegrees(
                            trajData.features[0].geometry.coordinates[0][0] - 0.01,
                            trajData.features[0].geometry.coordinates[0][1] - 0.01,
                            height
                        ),
                        label: {
                            text: `${Math.round(height / 60)} min`,
                            font: '12pt sans-serif',
                            fillColor: Cesium.Color.WHITE,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            pixelOffset: new Cesium.Cartesian2(0, -10)
                        }
                    });
                }

            } catch (error) {
                console.error("Failed to initialize Cesium viewer: ", error);
                setError('Failed to load 3D visualization');
            }
        };
        
        initializeCesium()

        return () => {
            if (viewerRef.current) {
                viewerRef.current.destroy();
                viewerRef.current = null;
            }
        };

    }, [trajData]);

    if (loading) return <div>Loading 3D Visualization</div>;
    if (error) return <div>Error: {error} </div>;

    return (
        <div className='trajectory-viewer-container' >
            <div id='cesiumContainer' className='cesium-container' />
                <div className='trajectory-info-panel'>
                    <div className='trajectory-info-title'>3D Trajectory Viewer</div>
                    <div>Time is represented on the Z-axis</div>
                    <div>Use mouse to rotate and zoom</div> 
                </div>
        </div>
    );
};

export default Trajectory3DViewer;