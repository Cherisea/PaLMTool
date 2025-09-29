import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text, PerspectiveCamera } from '@react-three/drei';
import { useRef, useState } from 'react';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';

import { SCALE_FACTOR, getZoomLevel, createGridLines, createTimeTicks } from './trajectory3DUtil';
import { useTrajData, useFullscreen, useFetchTrajData, useCameraDistance, use3DFilters } from './trajectory3DUtil';
import TrajectoryFilterPanel from './trajectory3DFilter';
import './trajectory3DViewer.css';

const Trajectory3DViewer = () => {
    // Track visibility of filters
    const [isFilterVisible, setIsFilterVisible] = useState(false);

    // Provides access to the actual div element for fullscreen
    const containerRef = useRef(null);

    // Utilize custom hooks
    const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
    const { trajData, loading, error } = useFetchTrajData();

    // Get original bounds without filters
    const unfiltered= useTrajData(trajData);
    const originalBounds = unfiltered?.originalBounds;

    // Initialize filter management 
    const {
        filters,
        isFilterActive,
        setIsFilterActive,
        updateFilters,
        resetFilters,
    } = use3DFilters(originalBounds);

    const prepared = useTrajData(trajData, isFilterActive ? filters : null);
    const { cameraDistance, cameraRef } = useCameraDistance(); 
    
    if (loading) return <div>Loading 3D visualization</div>;
    if (error) return <div>Error: {error}</div>;
    if (!prepared) return <div>Loading 3D visualization</div>;

    // Fetch range on all three dimensions and trajectory lines
    const {lonRange, latRange, lines, timeRange, minStart} = prepared;

    // Get current zoom level and spacing of grid
    const zoomLevel = getZoomLevel(cameraDistance);
    const gridSpacing = zoomLevel.gridSpacing;
    
    // Convert unit of lon and lat range from meter to visal units
    const xUnits = lonRange * SCALE_FACTOR;
    const yUnits = latRange * SCALE_FACTOR;
    const zUnits = zoomLevel.timeUnit === "hour" ? timeRange : timeRange * 60 / zoomLevel.timeStep;

    // Calculate range in visual units
    const gridCountX = Math.floor(xUnits / gridSpacing) + 1; 
    const gridCountY = Math.floor(yUnits / gridSpacing) + 1;

    const boxSize = [lonRange * SCALE_FACTOR, latRange * SCALE_FACTOR, zUnits * gridSpacing]

    return (
        <div ref={containerRef} className={`container ${isFullscreen ? 'fullscreen' : ''}` }>
            <Canvas>
                <color attach="background" args={['#1a1a1a']} />
                <PerspectiveCamera 
                    ref={cameraRef}
                    position={[50, -30, 50]}
                    fov={50}
                    makeDefault
                />
                <OrbitControls enablePan enableZoom enableRotate minDistance={50} maxDistance={400}/>

                <ambientLight intensity={0.5} />
                <directionalLight position={[50, 50, 25]} intensity={1} />
                <pointLight position={[-25, -25, -25]} intensity={0.5} />

                {createGridLines('x', gridCountX, lonRange * SCALE_FACTOR, latRange * SCALE_FACTOR, "red", zoomLevel)}
                {createGridLines('y', gridCountY, lonRange * SCALE_FACTOR, latRange * SCALE_FACTOR, "green", zoomLevel)}
                {createGridLines('z-x', zUnits + 1, lonRange * SCALE_FACTOR, latRange * SCALE_FACTOR, "blue", zoomLevel)}
                {createGridLines('z-y', zUnits + 1, lonRange * SCALE_FACTOR, latRange * SCALE_FACTOR, "blue", zoomLevel)}

                {/* Axis labels */}
                <Text position={[130, 0, 0]} fontSize={10} color="red">
                    Longitude
                </Text>
                <Text position={[0, 60, 0]} fontSize={14} color="green">
                    Latitude
                </Text>
                {createTimeTicks(zUnits + 1, 'white', minStart, zoomLevel)}

                {/* Transparent region bounds */}
                <mesh position={[lonRange * 0.005, latRange * 0.005, zUnits * 5]}>
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

            {/* 3D viewer title overlay */}
            <div className='overlay'>
                <div className='title'>3D Trajectory Viewer</div>
                <div className='subtitle'>Abstract 3D representation of trajectories (Orbit to rotate/zoom)</div>
                {isFilterActive && (
                    <div className='filter-status'>
                        Filtered: {lines.length} trajectories shown
                    </div>
                )}
            </div>

            {/* Filter panel */}
            <TrajectoryFilterPanel 
                filters={filters}
                updateFilters={updateFilters}
                resetFilters={resetFilters}
                originalBounds={originalBounds}
                isVisible={isFilterVisible}
                onToggle={() => setIsFilterVisible(!isFilterVisible)}
                isFilterActive={isFilterActive}
                setIsFilterActive={setIsFilterActive}
                zoomLevel={zoomLevel}
            />
            

            {/* Dynamic reference system info */}
            <div className='zoom-info'>
                    <div className='zoom-level'>Zoom Level: {zoomLevel.name}</div>
                    <div className='grid-info'>
                        Grid: {zoomLevel.distanceStep}{zoomLevel.distanceUnit} x {zoomLevel.timeStep}{zoomLevel.timeUnit}
                    </div>
                    <div className='distance-info'>
                        Camera Distance: {Math.round(cameraDistance)} units
                    </div>
            </div>

            {/* Fullscreen button */}
            <button className='fullscreen-button' onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                    {isFullscreen ? <FiMinimize2 size={20} /> : <FiMaximize2 size={20} />}
            </button>
        </div>
    );
}

export default Trajectory3DViewer;