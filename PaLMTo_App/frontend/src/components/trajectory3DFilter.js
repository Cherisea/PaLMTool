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


        </div>
    )
};

export default TrajectoryFilterPanel;