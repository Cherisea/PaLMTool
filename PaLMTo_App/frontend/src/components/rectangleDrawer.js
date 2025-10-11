import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from 'leaflet';
import 'leaflet-draw';

import './rectangleDrawer.css';

function RectangleDrawer({ onRectangleDrawn, isEnabled }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Disable permanent label on draw control
        L.drawLocal.draw.toolbar.buttons.rectangle = "";

        // Create a feature group to store drawn rectangles
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        // Initialize drawing tool 
        const drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                rectangle: {
                    shapeOptions: {
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
                featureGroup: drawnItems,
                remove: true
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
        }

        // Handle rectangle creation
        const handleDrawCreated = (e) => {
            const { layer } = e;

            // Add drawn rectangle to layer
            drawnItems.addLayer(layer)

            const bounds = layer.getBounds();

            // Extract coordinates
            const rectangleBounds = {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest()
            };

            onRectangleDrawn(rectangleBounds);
        };

        map.on(L.Draw.Event.CREATED, handleDrawCreated);

        return () => {
            // Clean up
            map.off(L.Draw.Event.CREATED, handleDrawCreated);
            if (isEnabled) {
                map.removeControl(drawControl);
            }
        };

    }, [map, isEnabled]);

    return null;
}

export default RectangleDrawer;