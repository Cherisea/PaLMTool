import React from "react";
import { FiFilter, FiRotateCcw, Fix } from 'react-icons/fi';

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
};

export default TrajectoryFilterPanel;