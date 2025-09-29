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

    // Convert decimal hours to hours followed by minutes
    const decimalToTime = (hour) => {
        const hr = Math.floor(hour);
        const min = (hour - hr) * 60
        return {hr, min};
    };

    // Convert separate hours and minutes to decimal hours
    const timeToDecimal = (hour, min) => {
        return hour + (min / 60); 
    } 

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

    // Handle adjustments to time range
    const handleTimeUpdate = (index, timeType, value) => {
        // Extract hour and min part from time to be changed
        const currTime = decimalToTime(filters.timeRange[index]);
        let newHours = currTime.hr;
        let newMins = currTime.min;

        if (timeType === 'hours') {
            newHours = parseInt(value || 0);
        } else if (timeType === 'mins') {
            newMins = parseInt(value || 0);
            newMins = Math.max(0, Math.min(59, newMins));
        }

        const newDecimalTime = timeToDecimal(newHours, newMins);

        // Clamp to bounds
        const min = originalBounds.minStart;
        const max = originalBounds.maxEnd;
        const clampedTime = Math.max(min, Math.min(max, newDecimalTime));

        const newRange = [...filters.timeRange];
        newRange[index] = clampedTime;
        updateFilters('timeRange', newRange);
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

    const startTime = decimalToTime(filters.timeRange[0]);
    const endTime = decimalToTime(filters.timeRange[1]);
    
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
                    <label className="filter-label">Time Range</label>
                    <div className="time-inputs">
                        <div className="time-group">
                            <label className="input-label">Start</label>
                            <div className="time-input-row">
                                <div className="time-input-container">
                                    <input 
                                        type="number"
                                        value={startTime.hr}
                                        onChange={(e) => handleTimeUpdate(0, 'hours', e.target.value)}
                                        min={originalBounds.minStart}
                                        max={originalBounds.maxEnd}
                                        step={1}
                                        readOnly
                                        className="time-input hour-input"
                                        placeholder="HH"
                                    />
                                    <span className="time-separator">:</span>
                                </div>
                                <div className="time-input-container">
                                    <input 
                                        type="number"
                                        value={startTime.min}
                                        onChange={(e) => handleTimeUpdate(0, 'mins', e.target.value)}
                                        min={originalBounds.minStart}
                                        max={originalBounds.maxEnd}
                                        step={30}
                                        readOnly
                                        className="time-input minute-input"
                                        placeholder="MM"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="time-group">
                            <label className="input-label">End</label>
                            <div className="time-input-row">
                                <div className="time-input-container">
                                    <input 
                                        type="number"
                                        value={endTime.hr}
                                        onChange={(e) => handleTimeUpdate(1, 'hours', e.target.value)}
                                        min={originalBounds.minStart}
                                        max={originalBounds.maxEnd}
                                        step={1}
                                        readOnly
                                        className="time-input hour-input"
                                        placeholder="HH"
                                    />
                                    <span className="time-separator">:</span>
                                </div>
                                <div className="time-input-container">
                                    <input 
                                        type="number"
                                        value={endTime.min}
                                        onChange={(e) => handleTimeUpdate(1, 'mins', e.target.value)}
                                        min={originalBounds.minStart}
                                        max={originalBounds.maxEnd}
                                        step={1}
                                        readOnly
                                        className="time-input minute-input"
                                        placeholder="MM"
                                    />
                                </div>
                            </div>
                        </div>

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