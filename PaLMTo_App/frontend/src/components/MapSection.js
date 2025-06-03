import { MapContainer, TileLayer, Marker, GeoJSON } from "react-leaflet";
import LocationPicker from "./LocationPicker";
import MapUpdater from "./MapUpdater";

const LocationSelectionMap = ({ mapCenter, locationCoordinates, onLocationSelect }) => (
  <div className="map-container">
    <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
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

const TrajectoryMap = ({ title, data, center, color }) => (
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
    </div>
  </div>
);

const HeatmapMap = ({ title, data, center, bounds, style, onEachFeature }) => (
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

function MapSection({ mapCenter, locationCoordinates, onLocationSelect, visualData, heatmapData, heatmapActive }) {
  // Color scale function for heatmap
  const getColor = (normalized) => {
    if (normalized > 0.8) return '#800026';
    if (normalized > 0.6) return '#BD0026';
    if (normalized > 0.4) return '#E31A1C';
    if (normalized > 0.2) return '#FC4E2A';
    if (normalized > 0.1) return '#FD8D3C';
    if (normalized > 0.05) return '#FEB24C';
    if (normalized > 0) return '#FED976';
    return '#FFEDA0';
  };

  const heatmapStyle = (feature) => {
    return {
      fillColor: getColor(feature.properties.normalized),
      weight: 0.5,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

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

  // Show heatmap if active and data available
  if (heatmapActive && heatmapData) {
    return (
      <div className="map-box">
        <div style={{ display: 'flex', gap: '20px', height: '500px' }}>
          <HeatmapMap
            title="Original Trajectories Heatmap"
            data={heatmapData.original}
            center={heatmapData.center}
            bounds={heatmapData.bounds}
            style={heatmapStyle}
            onEachFeature={onEachFeature}
          />
          <HeatmapMap
            title="Generated Trajectories Heatmap"
            data={heatmapData.generated}
            center={heatmapData.center}
            bounds={heatmapData.bounds}
            style={heatmapStyle}
            onEachFeature={onEachFeature}
          />
        </div>
      </div>
    );
  }

  // Default to trajectory view
  return (
    <div className="map-box">
      <div style={{ display: 'flex', gap: '20px', height: '500px' }}>
        <TrajectoryMap
          title="Original Trajectories"
          data={visualData.original}
          center={visualData.center}
          color="blue"
        />
        <TrajectoryMap
          title="Generated Trajectories"
          data={visualData.generated}
          center={visualData.center}
          color="red"
        />
      </div>
    </div>
  );
};

export default MapSection; 