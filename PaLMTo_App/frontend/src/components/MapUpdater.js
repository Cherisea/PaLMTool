import { useEffect } from "react";
import { useMap } from "react-leaflet";

function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
}

export default MapUpdater; 