import React from "react";
import { FiX } from "react-icons/fi";

const MapMatchInputModal = ({isOpen, percentage, onPercentageChange, onSubmit, onCancel}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button onClick={onCancel} className="modal-close-btn" title="Close">
                    <FiX size={20} />
                </button>

                <h3>Map-matching Configuration</h3>
                <p>Enter the percentage of generated trajectories to process for map-matching:</p>
                <div style={{ marginBottom: '20px' }}>
                    <input 
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={percentage}
                        onChange={(e) => onPercentageChange(parseFloat(e.target.value))}
                        style={{
                            width: '100px',
                            padding: '8px',
                            fontSize: '16px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                    />
                    <span style={{ marginLeft: '10px' }}>%</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={onSubmit} style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        background: '#4CAF50',
                        color: 'white',
                        cursor: 'pointer'
                    }}>Process</button>
                </div>
            </div>
        </div>
    );
};

export default MapMatchInputModal;