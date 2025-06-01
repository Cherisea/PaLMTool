import { MapContainer, TileLayer, Marker, GeoJSON } from "react-leaflet";
import { useState } from "react";
import LocationPicker from "./LocationPicker";
import MapUpdater from "./MapUpdater";

function MapSection({ mapCenter, locationCoordinates, onLocationSelect, visualData }) {
  // Declare a state variable to store name of current active tab
  const [activeTab, setActiveTab] = useState('location')

  return (
    <div className="map-box">
      {/* Tab buttons - only show if visualization data exists */}
      {visualData && (
        <div className="map-tabs">
          <button className={activeTab === 'location' ? 'active' : ''} onClick={() => setActiveTab('location')}>
            Location Selection
          </button>

          <button className={activeTab === 'trajectories' ? 'active' : ''} onClick={() => setActiveTab('trajectories')}>
            Trajectory Comparison
          </button>

        </div>
      )}

      {/* Show corresponding view based on active tab */}
      {( !visualData || activeTab === 'location') ? (
        // Default single map
        <div className="map-container">
          <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
              {/* Display actual map image by dynamically calculating tile coordinates */}
              <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapUpdater center={mapCenter} />

              <LocationPicker onSelect={onLocationSelect} />
              {locationCoordinates && (<Marker position={locationCoordinates} />)}

          </MapContainer>
        </div>
      ) : (
        // Trajectory comparison view
        <div style={{ display: 'flex', gap: '20px', height: '500px' }}>
          <div style={{ flex: 1 }}>
            <h3>Original Trajectories</h3>
            <div className="map-container" style={{ height: 'calc(100% - 40px)' }}>
              <MapContainer center={visualData.center} zoom={12} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <GeoJSON 
                  data={visualData.original} 
                  style={{ color: 'blue', weight: 2 }} 
                />

              </MapContainer>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <h3>Generated Trajectories</h3>
            <div className="map-container" style={{ height: 'calc(100% - 40px)' }}>
              <MapContainer center={visualData.center} zoom={12} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <GeoJSON 
                  data={visualData.generated} 
                  style={{ color: 'blue', weight: 2 }} 
                />

              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapSection; 