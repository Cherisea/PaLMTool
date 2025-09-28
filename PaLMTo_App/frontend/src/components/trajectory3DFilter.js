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
                            
                        />
                    </div>
                </div>


            </div>


        </div>
    )
};

export default TrajectoryFilterPanel;