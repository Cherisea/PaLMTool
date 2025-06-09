import React from 'react';

function StatisticsPopup({ isOpen, onClose, stats }) {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-content">

        <div className="popup-header">
          <h3>Generation Statistics</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-body">
          <div className="stat-item">
            <span className="stat-label">Cells Created:</span>
            <span className="stat-value">{stats.cellsCreated.toLocaleString()}</span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Unique Bigrams:</span>
            <span className="stat-value">{stats.uniqueBigrams.toLocaleString()}</span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Unique Trigrams:</span>
            <span className="stat-value">{stats.uniqueTrigrams.toLocaleString()}</span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default StatisticsPopup;