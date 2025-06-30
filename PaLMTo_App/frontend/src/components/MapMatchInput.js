import React from "react";
import { FiX } from "react-icons/fi";

const MapMatchInputModal = ({isOpen, percentage, onPercentageChange, onSubmit, onCancel}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Map-matching Configuration</h3>
                <button onClick={onCancel} className="modal-close-btn" title="Close">
                        <FiX size={20} />
                </button>
                <p>Proportion to Process</p>
                <div className="input-container">
                    <input 
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={percentage}
                        onChange={(e) => onPercentageChange(parseFloat(e.target.value))}
                        className="percentage-input"
                    />
                    <span className="input-suffix">%</span>
                </div>

                <div className="process-btn-container">
                    <button onClick={onSubmit} className="process-button">Process</button>
                </div>
            </div>
        </div>
    );
};

export default MapMatchInputModal;