import { useMapEvents } from "react-leaflet";

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

export default LocationPicker; 