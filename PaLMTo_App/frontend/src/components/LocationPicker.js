/*
  This JS function allows a user to pick a location by clicking on map.
*/
import { useMapEvents } from "react-leaflet";

function LocationPicker({ onSelect }) {
  // A hooks that Listen to map events like click, zoom
  useMapEvents({
    click(e) {
      onSelect(e.latlng);   // Invokes a callback function passed in object destructuring
    },
  });

  return null;    // No UI components rendered by this function
}

export default LocationPicker; 