import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from 'leaflet';
import 'leaflet-draw';

function RectangleDrawer({ onRectangleDrawn, isEnabled }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Set custom text on draw control
        L.drawLocal.draw.toolbar.buttons.rectangle = "";

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
            }
        });

        // Controls drawing component 
        if (isEnabled) {
            map.addControl(drawControl);

            // Add hover-only tooltip on rectangle icon
            setTimeout(() => {
                const rectangleButton = document.querySelector('.leaflet-draw-draw-rectangle');
                if (rectangleButton) {
                    rectangleButton.setAttribute('title', 'Select a rectangle area');
                }
            }, 0)
        } else {
            map.removeControl(drawControl);
        }

        // Handle rectangle creation
        const handleDrawCreated = (e) => {
            const { layer } = e;
            const bounds = layer.getBounds();

            // Extract coordinates
            const rectangleBounds = {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest()
            };

            onRectangleDrawn(rectangleBounds);

            // Remove rectangle after selection
            map.removeLayer(layer);
        };

        map.on(L.Draw.Event.CREATED, handleDrawCreated);

        return () => {
            // Clean up
            map.off(L.Draw.Event.CREATED, handleDrawCreated);
            map.removeControl(drawControl);
        };

    }, [map, isEnabled, onRectangleDrawn]);

    return null;
}

export default RectangleDrawer;