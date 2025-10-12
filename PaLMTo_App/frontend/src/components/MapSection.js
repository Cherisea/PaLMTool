import { MapContainer, TileLayer, Marker, GeoJSON } from "react-leaflet";
import LocationPicker from "./locationPicker";
import MapUpdater from "./mapUpdater";
import { useState, useEffect } from "react";
import axios from "axios";
import { FiDownload } from "react-icons/fi";
import Trajectory3DViewer from "./trajectory3DViewer";
import RectangleDrawer from "./rectangleDrawer";

const LocationSelectionMap = ({ mapCenter, locationCoordinates, onLocationSelect }) => (
  <div className="map-container">
    <MapContainer center={mapCenter} zoom={2} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={mapCenter} />
      <LocationPicker onSelect={onLocationSelect} />
      {locationCoordinates && <Marker position={locationCoordinates} />}
    </MapContainer>
  </div>
);

const TrajectoryMap = ({ title, data, center, color, onDownload, bounce, showDownload=false, 
  showRectangleDrawer=false, onRectangleDrawn}) => (
  <div style={{ flex: 1 }}>
    <h3>{title}</h3>
    <div className="map-container" style={{ height: 'calc(100% - 40px)' }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GeoJSON data={data} style={{ color, weight: 2 }} />

        {/* Add rectangle drawer for original trajectory map only */}
        {showRectangleDrawer && (
          <RectangleDrawer 
            onRectangleDrawn={onRectangleDrawn}
            isEnabled={showRectangleDrawer}
          />
        )}
      </MapContainer>


      {/* Download button overlay */}
      {showDownload && onDownload && (
        <div className={`download-overlay${bounce ? ' bounce' : ''}`}
             onClick={onDownload} 
             title="Download generated trajectories">
          <FiDownload size={24} />
        </div>
      )}

    </div>
  </div>
);

const HeatMap = ({ title, data, center, bounds, style, onEachFeature }) => (
  <div style={{ flex: 1 }}>
    <h3>{title}</h3>
    <div className="map-container" style={{ height: 'calc(100% - 40px)' }}>
      <MapContainer center={center} bounds={bounds} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <GeoJSON data={data} style={style} onEachFeature={onEachFeature} />
      </MapContainer>
    </div>
  </div>
);

const AreaGenerationPopup = ({ selectedArea, onGenerate, onCancel }) => {
  if (!selectedArea) return null;

  // Format bounds for display
  const formatBounds = (bounds) => {
    return {
      north: bounds.north.toFixed(6),
      south: bounds.south.toFixed(6),
      east: bounds.east.toFixed(6),
      west: bounds.west.toFixed(6)
    };
  };

  const formattedBounds = formatBounds(selectedArea);

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h3>Generate from Selected Area</h3>

        <div>
          <p>Selected Area Bounds:</p>
          <div>
            <div><strong>North:</strong> {formattedBounds.north}</div>
            <div><strong>South:</strong> {formattedBounds.south}</div>
            <div><strong>East:</strong> {formattedBounds.east}</div>
            <div><strong>West:</strong> {formattedBounds.west}</div>
          </div>
        </div>

        <p>
          Generate new trajectories from data in selected area?
        </p>

        <div className="popup-actions">
          <button type="button" onClick={onGenerate}>Generate</button>
          <button type="button" className="danger-button" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Main entry of script
function MapSection({ mapCenter, locationCoordinates, onLocationSelect, visualData, 
  heatmapData, generatedFileName, isFormCollapsed, onAreaSelected }) 
{
  // Declare a state variable for current view mode
  const [viewMode, setViewMode] = useState('trajectory');

  // Declare a state variable for download bounce effect
  const [bounceDownload, setBounceDownload] = useState(false);

  // Declare a state variable for showing "save as" window
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  
  // Declare a state variable for new file name
  const [saveAsFilename, setSaveAsFilename] = useState('');

  // Declare a state variable for current file name
  const [pendingDownloadFile, setPendingDownloadFile] = useState('');

  // Decalre a state variable for rectangle selection
  const [selectedArea, setSelectedArea] = useState(null);

  // Handle rectangle selection
  const handleRectangleDrawn = (bounds) => {
    setSelectedArea(bounds);
    // Elevate selected bounds to first level component
    if (onAreaSelected) {
      onAreaSelected(bounds);
    }
  }

  // Function that control bounce effect of download button
  const triggerBounce = () => {
    setBounceDownload(true);
    setTimeout(() => {
      setBounceDownload(false);
      setTimeout(() => {
        setBounceDownload(true);
        setTimeout(() => {
          setBounceDownload(false);
        }, 1000)
      }, 1000);
    }, 1000);
  }

  // Set up a side effect that calls bounce 
  useEffect(() => {
    if (generatedFileName) {
      triggerBounce();
    }
  }, [generatedFileName])

  const ViewBtns = () => {
    const snapshots = [
      {
        id: 'trajectory',
        title: 'Trajectory View',
        available: !!visualData,
        color: '#007bff'
      },
      {
        id: 'heatmap',
        title: 'Heatmap View',
        available: !!heatmapData,
        color: '#ff9800'
      },
      {
        id: '3d',
        title: '3D View',
        available: !!visualData,
        color: '#9c27b0'
      }
      
    ]; 

    return (
      <div className="view-buttons-container">
        {snapshots.map((snap) => {
          return (
            <button
              key={snap.id}
              className={
                `view-button` + 
                (viewMode === snap.id ? ' active' : '') +
                (!snap.available ? ' disabled' : '') 
              }
              onClick={() => {
                if (snap.available) {
                  setViewMode(snap.id)
                }
              }}
              disabled={!snap.available}
            >
              <span className="view-button-text">{snap.title}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // Color scale function for heatmap
  const getColor = (normalized) => {
    // More breakpoints for smoother transitions matching matplotlib's YlOrRd
    if (normalized >= 0.95) return '#800026';
    if (normalized >= 0.85) return '#990026';
    if (normalized >= 0.75) return '#BD0026';
    if (normalized >= 0.65) return '#D70026';
    if (normalized >= 0.55) return '#E31A1C';
    if (normalized >= 0.45) return '#F03B20';
    if (normalized >= 0.35) return '#FC4E2A';
    if (normalized >= 0.25) return '#FD8D3C';
    if (normalized >= 0.15) return '#FEB24C';
    if (normalized >= 0.10) return '#FEC44F';
    if (normalized >= 0.05) return '#FED976';
    if (normalized > 0) return '#FFEDA0';
    return '#FFFFCC';
  };

  // Styling of heatmap cells
  const heatmapStyle = (feature) => {
    return {
      fillColor: getColor(feature.properties.normalized),
      weight: 0.5,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

  // Display a popup box when hovering on a cell
  const onEachFeature = (feature, layer) => {
    layer.bindPopup(`Count: ${feature.properties.count}`);
  };

  // Handle download requests with user-specified filenames
  const handleSaveAsDownload = async () => {
    if (!pendingDownloadFile) return;

    const downloadUrl = `${process.env.REACT_APP_API_URL}/trajectory/download/${pendingDownloadFile}`
    const response = await axios.get(downloadUrl, {responseType: 'blob'});

    // Create a temporary browser url that points to blob file
    const url = window.URL.createObjectURL(response.data);
    const a = document.createElement('a');

    a.href = url;
    a.download = saveAsFilename || pendingDownloadFile;
    document.body.appendChild(a)

    // Start download
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);
    setShowSaveAsModal(false);

  }

  // Show default view if a response hasn't been received 
  if (!visualData) {
    return (
      <div className={`map-box ${isFormCollapsed ? 'expanded' : ''}`}>
        <LocationSelectionMap 
          mapCenter={mapCenter}
          locationCoordinates={locationCoordinates}
          onLocationSelect={onLocationSelect}
        />
      </div>
    );
  }

  return (
    <div className={`map-box ${isFormCollapsed ? 'expanded' : ''}`} style={{ position: 'relative' }}>

      {viewMode === '3d' ? (
        <div style={{ display: 'flex', height: '600px', marginTop: '10px' }}>
          <Trajectory3DViewer />
        </div>
      ) : viewMode === 'heatmap' && heatmapData ? (
        <div style={{ display: 'flex', gap: '20px', height: '600px', marginTop: '10px' }}>
          <HeatMap
            title="Original Trajectories Heatmap"
            data={heatmapData.original}
            center={heatmapData.center}
            bounds={heatmapData.bounds}
            style={heatmapStyle}
            onEachFeature={onEachFeature}
          />
          <HeatMap
            title="Generated Trajectories Heatmap"
            data={heatmapData.generated}
            center={heatmapData.center}
            bounds={heatmapData.bounds}
            style={heatmapStyle}
            onEachFeature={onEachFeature}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', height: '600px', marginTop: '10px' }}>
          <TrajectoryMap
            title="Original Trajectories"
            data={visualData.original}
            center={visualData.center}
            color="blue"
            showDownload={false}
            showRectangleDrawer={true}
            onRectangleDrawn={handleRectangleDrawn}
          />
          <TrajectoryMap
            title="Generated Trajectories"
            data={visualData.generated}
            center={visualData.center}
            color="red"
            showDownload={true}
            onDownload={() => {
              setPendingDownloadFile(generatedFileName);
              setSaveAsFilename(generatedFileName);
              setShowSaveAsModal(true);
            }}
            bounce={bounceDownload}
          />
        </div>
      )}
      <ViewBtns />

      {showSaveAsModal && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Save As</h3>
            <input 
              type='text'
              value={saveAsFilename}
              onChange={e => setSaveAsFilename(e.target.value)}
              placeholder={pendingDownloadFile}
            />

            <div className="popup-actions">
              <button type="button" onClick={handleSaveAsDownload}>Confirm</button>
              <button type="button" className="danger-button" onClick={() => setShowSaveAsModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default MapSection; 