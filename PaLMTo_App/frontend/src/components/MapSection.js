import { MapContainer, TileLayer, Marker } from "react-leaflet";
import LocationPicker from "./LocationPicker";
import MapUpdater from "./MapUpdater";

function MapSection({ mapCenter, locationCoordinates, onLocationSelect }) {
  return (
    <div className="map-box">
      <MapContainer center={mapCenter} zoom={13} style={{ height: "600px", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={mapCenter} />

        <LocationPicker onSelect={onLocationSelect} />
        {locationCoordinates && (<Marker position={locationCoordinates} />)}
      </MapContainer>
    </div>
  );
}

export default MapSection; 