import React from "react";
import { FiFilter, FiRotateCcw, FiX } from 'react-icons/fi';

const TrajectoryFilterPanel = ({
    filters,
    updateFilters,
    resetFilters,
    originalBounds,
    isVisible,
    onToggle,
    isFilterActive,
    setIsFilterActive
}) => {
    if (!filters || !originalBounds ) return null;

    // Convert hours to a string expression formmated as hr:min
    const formatTime = (hour) => {
        const hr = Math.floor(hour);
        const min = (hour - hr) * 60
        return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    };

    // Convert coordinate to string with 6 decimal places(about 0.1 meter)
    const formatCoord = (coord, decimals = 6) => {
        return coord.toFixed(decimals);
    }

    // Handle range update
    const handleRangeUpdate = (type, index, value) => {
        const newRange = [...filters[type]];
        newRange[index] = parseFloat(value);
        updateFilters(type, newRange);
        setIsFilterActive(true);
    }

    // Handle adjustments to coords
    const handleCoordAdjust = (type, index, direction) => {
        const step = type === 'timeRange' ? 0.1 : 0.0001;
        const newVal = filters[type][index] + (direction === 'up' ? step : -step);

        // Clamp to bounds
        const min = type === 'timeRange' ? originalBounds.minStart :
            type === 'lonRange' ? originalBounds.minLon : originalBounds.minLat;
        const max = type === 'timeRange' ? originalBounds.maxEnd :
            type === 'lonRange' ? originalBounds.maxLon : originalBounds.maxLat;

        const clampedVal = Math.max(min, Math.min(newVal, max));
        handleRangeUpdate(type, index, clampedVal);
    }

    if (!isVisible) {
        return (
            <button 
                className="filter-toggle-btn"
                onClick={onToggle}
                title="Show trajectory filters"
            >
                <FiFilter size={20} />
            </button>
        )
    }

    return (
        <div className="filter-panel">
            {/* Filter panel metadata */}
            <div className="filter-header">
                <div className="filter-title">
                    <p>Trajectory Filters</p>
                </div>
                <div className="filter-actions">
                    <button
                        className="filter-reset-btn"
                        onClick={resetFilters}
                        title="Reset filters"
                        disabled={!isFilterActive}
                    >
                        <FiRotateCcw size={14} />
                    </button>
                    <button
                        className="filter-close-btn"
                        onClick={onToggle}
                        title="Hide filters"
                    >
                        <FiX size={16} />
                    </button>
                </div>
            </div>

            <div className="filter-content">
                {/* Time range filter */}
                <div className="filter-group">
                    <label className="filter-label">
                        Time Range: {formatTime(filters.timeRange[0])} - {formatTime(filters.timeRange[1])}
                    </label>
                    <div className="range-sliders">
                        <input 
                            type='range'
                            min={originalBounds.minStart}
                            max={originalBounds.maxEnd}
                            step={0.1}
                            value={filters.timeRange[0]}
                            onChange={(e) => handleRangeUpdate('timeRange', 0, e.target.value)}
                            className="range-slider range-slider-start"
                        />
                        <input 
                            type='range'
                            min={originalBounds.minStart}
                            max={originalBounds.maxEnd}
                            step={0.1}
                            value={filters.timeRange[1]}
                            onChange={(e) => handleRangeUpdate('timeRange', 1, e.target.value)}
                            className="range-slider range-slider-end"
                        />
                    </div>
                </div>

                {/* Longitude range filter */}
                <div className="filter-group">
                    <label className="filter-label">Longitude Range</label>
                    <div className="precise-inputs">
                        <div className="input-group">
                            <label className="input-label">Start</label>
                            <div className="input-with-buttons">
                                <input 
                                    type="number"
                                    value={formatCoord(filters.lonRange[0])}
                                    onChange={(e) => handleRangeUpdate('lonRange', 0, e.target.value)}
                                    step="0.0001"
                                    min={originalBounds.minLon}
                                    max={originalBounds.maxLon}
                                    className="precise-input"
                                />
                                
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">End</label>
                            <div className="input-with-buttons">
                                <input 
                                    type="number"
                                    value={formatCoord(filters.lonRange[1])}
                                    onChange={(e) => handleRangeUpdate('lonRange', 1, e.target.value)}
                                    step="0.0001"
                                    min={originalBounds.minLon}
                                    max={originalBounds.maxLon}
                                    className="precise-input"
                                />
                                
                            </div>
                        </div>
                    </div>
                </div>

                {/* Latitude range filter */}
                <div className="filter-group">
                    <label className="filter-label">Latitude Range</label>
                    <div className="precise-inputs">
                        <div className="input-group">
                            <label className="input-label">Start</label>
                            <div className="input-with-buttons">
                                <input 
                                type="number"
                                min={originalBounds.minLat}
                                max={originalBounds.maxLat}
                                step={0.0001}
                                value={formatCoord(filters.latRange[0])}
                                onChange={(e) => handleRangeUpdate('latRange', 0, e.target.value)}
                                className="precise-input"
                                />
                            </div>
                        </div>
                        
                        <div className="input-group">
                            <label className="input-label">End</label>
                            <div className="input-with-buttons">
                                <input 
                                type="number"
                                min={originalBounds.minLat}
                                max={originalBounds.maxLat}
                                step={0.0001}
                                value={filters.latRange[1]}
                                onChange={(e) => handleRangeUpdate('latRange', 1, e.target.value)}
                                className="precise-input"
                                />
                            </div>
                        </div>
                        
                    </div>
                </div>
            </div>


        </div>
    )
};

export default TrajectoryFilterPanel;