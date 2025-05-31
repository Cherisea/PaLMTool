/*
  This JS function updates map view whenever map center is changed or map instance is recreated.
*/

import { useEffect } from "react";
import { useMap } from "react-leaflet";

function MapUpdater({ center }) {
  // Retrieve leaflet map instance 
  const map = useMap();

  useEffect(() => {
    map.setView(center);   // Move map view to new center
  }, [center, map]);  // Dependency array

  return null;
}

export default MapUpdater; 