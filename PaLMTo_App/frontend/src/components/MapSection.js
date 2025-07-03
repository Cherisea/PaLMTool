import { MapContainer, TileLayer, Marker, GeoJSON } from "react-leaflet";
import LocationPicker from "./LocationPicker";
import MapUpdater from "./MapUpdater";
import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { FiDownload } from "react-icons/fi";
import MapMatchInputModal from "./MapMatchInput";

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

const TrajectoryMap = ({ title, data, center, color, onDownload, bounce, showDownload=false}) => (
  <div style={{ flex: 1 }}>
    <h3>{title}</h3>
    <div className="map-container" style={{ height: 'calc(100% - 40px)' }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GeoJSON data={data} style={{ color, weight: 2 }} />
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

function getRandomColor() {
  // Generate random hex code for coloring snapped trajectories
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function onEachSnappedFeature(feature, layer) {
  // Add a popup window to each trajectory when hovered
  if (feature.properties && feature.properties.trip_id) {
    layer.bindPopup(`Trip ID: ${feature.properties.trip_id}`);
    layer.on('mouseover', function () { this.openPopup(); });
  }
}

const  MapMatchingMap = ({ title, data, center, onDownload, perc, bounce }) => (
  <div style={{ flex: 1 }}>
    <h3 style={{ textAlign: "center" }}>
      {title} {perc !== undefined && `(${perc}% Processed)`}
    </h3>
    <div className="map-container" style={{ height: 'calc(100% - 40px)' }}>
      <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
        <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {data.features.map((feature, index) => {
          const color = getRandomColor();
          return (
            <GeoJSON key={feature.properties.trip_id || index} 
                     data={feature} 
                     style={{ color: color, weight: 5, opacity: 1, dashArray: "10, 6", lineCap: "butt" }}
                     onEachFeature={onEachSnappedFeature} />
          )
        })}
        
      </MapContainer>

      {/* Download button overlay */}
      {onDownload && (
        <div className={`download-overlay${bounce ? ' bounce' : ''}`} 
             onClick={onDownload} 
             title="Download map-matched trajectories">
          <FiDownload size={24} />
        </div>
      )}
    </div>
  </div>
);

// Main entry of script
function MapSection({ mapCenter, locationCoordinates, onLocationSelect, visualData, heatmapData, generatedFileName, onDownload }) 
{
  // Declare a state variable for current view mode
  const [viewMode, setViewMode] = useState('trajectory');

  // Declare a state variable for map matching data
  const [mapMatchData, setMapMatchData] = useState(null);

  // Declare a state variable for status of fetching map matching data
  const [mapMatchLoading, setMapMatchLoading] = useState(false);

  // Declare a state variable for filename of matched trajectories saved in csv
  const [matchedTrajFile, setMatchedTrajFile] = useState(''); 

  // Declare a state variable for the presence of user input in map-matching view
  const [showMapMatchInput, setShowMapMatchInput] = useState(false);

  // Declare a state variable for user input
  const [mapMatchPerc, setMapMatchPerc] = useState(1);

  // Declare a state variable for download bounce effect
  const [bounceDownload, setBounceDownload] = useState(false);

  // Declare a state variable for hovering state of a snapshot
  const [hovered, setHovered] = useState(null);

  // ? Consider moving data fetching logic to a separate script
  const fetchMapMatchingData = useCallback(async (percentage) => {
    setMapMatchLoading(true);
    try {
      const response = await axios.post('trajectory/map-match/', {
        filename: generatedFileName,
        percentage: percentage
      });
      setMapMatchData(response.data.map_data);
      setMatchedTrajFile(response.data.output_file)
    } catch (error) {
      console.error('Failed to fetch map-matching data: ', error);
    } finally {
      setMapMatchLoading(false);
    }
  }, [generatedFileName]);

  // Show input box when switching to map-matching view
  const handleMapMatchView = () => {
    if (!mapMatchData && viewMode !== 'map-matching' && !mapMatchLoading) {
      setShowMapMatchInput(true);
    } else if (viewMode !== 'map-matching' || mapMatchData) {
      setViewMode('map-matching');
    }
  }

  // Process user input submission
  const handleMapMatchSubmit = () => {
    setShowMapMatchInput(false);
    setViewMode('map-matching');
    fetchMapMatchingData(mapMatchPerc);
  }

  // Process user input cancellation
  const handleMapMatchCancel = () => {
    setShowMapMatchInput(false);
    setMapMatchPerc(1);
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
    if (generatedFileName || mapMatchData) {
      triggerBounce();
    }
  }, [generatedFileName, mapMatchData])

  const ViewSnapshots = () => {
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
        id: 'map-matching',
        title: 'Map-Matching View',
        available: !!mapMatchData,
        color: '#4caf50'
      }
    ]; 

    return (
      <div className="view-snapshots-bar">
        {snapshots.map((snap, idx) => (
          <div
            key={snap.id}
            className={
              `snapshot-thumb` + 
              (viewMode === snap.id ? ' active' : '') +
              (!snap.available ? ' disabled' : '') + 
              (hovered === idx ? ' hovered' : hovered !== null ? ' not-hovered' : '')
            }
            onClick={() => {
              if (snap.id === 'map-matching') {
                if (snap.available) {
                  setViewMode('map-matching');
                } else {
                  handleMapMatchView();
                }
              } else if (snap.available) {
                setViewMode(snap.id)
              }
            }}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
            title={snap.title}
          >
          </div>
        ))}
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

  // Show default view if a response hasn't been received 
  if (!visualData) {
    return (
      <div className="map-box">
        <LocationSelectionMap 
          mapCenter={mapCenter}
          locationCoordinates={locationCoordinates}
          onLocationSelect={onLocationSelect}
        />
      </div>
    );
  }

  return (
    <div className="map-box" style={{ position: 'relative' }}>
      
      <MapMatchInputModal 
        isOpen={showMapMatchInput}
        percentage={mapMatchPerc}
        onPercentageChange={setMapMatchPerc}
        onSubmit={handleMapMatchSubmit}
        onCancel={handleMapMatchCancel}
      />

      {viewMode === 'heatmap' && heatmapData ? (
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
      ) : viewMode === 'map-matching' && generatedFileName ? (
        <div style={{ display: 'flex', height: '600px', marginTop: '10px'}}>
          {mapMatchLoading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              width: '100%',
              fontSize: '18px',
              color: '#666'}}>
              <div>Generating map-matching data...</div>
              <div className="spinner" style={{
                marginLeft: '24px',
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #3498db',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
          ) : mapMatchData ? (
            <MapMatchingMap
              title="Map-matched Trajectories"
              data={mapMatchData}
              center={visualData.center}
              onDownload={() => onDownload(matchedTrajFile)}
              perc={mapMatchPerc}
              bounce={bounceDownload}
            />
          ) : (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              fontSize: '18px',
              color: '#666'}}>
              Failed to load map-matching data
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', height: '600px', marginTop: '10px' }}>
          <TrajectoryMap
            title="Original Trajectories"
            data={visualData.original}
            center={visualData.center}
            color="blue"
            showDownload={false}
          />
          <TrajectoryMap
            title="Generated Trajectories"
            data={visualData.generated}
            center={visualData.center}
            color="red"
            showDownload={true}
            onDownload={() => onDownload(generatedFileName)}
            bounce={bounceDownload}
          />
        </div>
      )}
      <ViewSnapshots />
    </div>
  );

};

export default MapSection; 