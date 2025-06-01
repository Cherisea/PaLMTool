import { MapContainer, TileLayer, Marker, GeoJSON } from "react-leaflet";
import LocationPicker from "./LocationPicker";
import MapUpdater from "./MapUpdater";

function MapSection({ mapCenter, locationCoordinates, onLocationSelect, visualData }) {

  return (
    <div className="map-box">

      {/* Show corresponding view based on active tab */}
      {( !visualData ) ? (
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
                  style={{ color: 'red', weight: 2 }} 
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