import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

const MapMatchInputModal = ({isOpen, percentage, onPercentageChange, onSubmit, onCancel, numTrajs}) => {
    const [showMessage, setShowMessage] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setShowMessage(true);
        const timer = setTimeout(() => setShowMessage(false), 3000);
        return () => clearTimeout(timer);
    }, [percentage, isOpen])

    if (!isOpen) return null;

    const validPerct = isNaN(percentage) || percentage === 0 ? 1 : percentage
    const count = Math.ceil((validPerct / 100) * numTrajs) || 1;
    const estimatedTime = count * 8 || 8;

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
                
                {showMessage && <div className="processing-time-message">
                    Approximate processing time for {count} requests: <b>{estimatedTime}</b> seconds 
                </div>}

                <div className="process-btn-container">
                    <button onClick={onSubmit} className="process-button">Process</button>
                </div>
            </div>
        </div>
    );
};

export default MapMatchInputModal;