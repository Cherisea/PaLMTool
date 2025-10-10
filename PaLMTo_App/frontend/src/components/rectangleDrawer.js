import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from 'leaflet';
import 'leaflet-draw';

function RectangleDrawer({ onRectangleDrawn, isEnabled }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Initialize drawing tool 
        const drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                rectangle: {
                    shapeOptions: {
                        color: '#ff0000',
                        weight: 2,
                        fillOpacity: 0.1
                    }
                },
                polyline: false,
                polygon: false,
                circle: false,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: new L.FeatureGroup(),
                remove: true
            }
        });

        // Controls drawing component 
        if (isEnabled) {
            map.addControl(drawControl);
        } else {
            map.removeControl(drawControl);
        }

    })

}