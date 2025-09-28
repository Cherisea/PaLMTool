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

    // Format hours expressed as fractional number as whole-number hours and mins
    const formatTime = (hour) => {
        const hr = Math.floor(hour);
        const min = (hour - hr) * 60
        return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    };

    // Handle range update
    const handleRangeUpdate = (type, index, value) => {
        const newRange = [...filters[type]];
        newRange[index] = parseFloat(value);
        updateFilters(type, newRange);
        setIsFilterActive(true);
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
                    <FiFilter size={16} />
                    <span>Trajectory Filters</span>
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
                    <label className="filter-label">
                        Longitude: {filters.lonRange[0]} - {filters.lonRange[1]}
                    </label>
                    <div className="range-sliders">
                        <input
                            type="range"
                            min={originalBounds.minLon}
                            max={originalBounds.maxLon}
                            step={0.0001}
                            value={filters.lonRange[0]}
                            onChange={(e) => handleRangeUpdate('lonRange', 0, e.target.value)}
                            className="range-slider range-slider-start"
                        />
                        <input
                            type="range"
                            min={originalBounds.minLat}
                            max={originalBounds.maxLat}
                            step={0.0001}
                            value={filters.latRange[1]}
                            onChange={(e) => handleRangeUpdate('latRange', 0, e.target.value)}
                            className="range-slider range-slider-end"
                        />
                    </div>
                </div>

                {/* Latitude range filter */}
                <div className="filter-group">
                    <label className="filter-label">
                        Latitude: {filters.latRange[0]} - {filters.latRange[1]}
                    </label>

                    <div className="range-sliders">
                        <input 
                            type="range"
                            min={originalBounds.minLat}
                            max={originalBounds.maxLat}
                            step={0.0001}
                            value={filters.latRange[0]}
                            onChange={(e) => handleRangeUpdate('latRange', 0, e.target.value)}
                            className="range-slider range-slider-start"
                        />
                        <input 
                            type="range"
                            min={originalBounds.minLat}
                            max={originalBounds.maxLat}
                            step={0.0001}
                            value={filters.latRange[1]}
                            onChange={(e) => handleRangeUpdate('latRange', 1, e.target.value)}
                            className="range-slider range-slider-end"
                        />
                    </div>
                </div>
            </div>


        </div>
    )
};

export default TrajectoryFilterPanel;