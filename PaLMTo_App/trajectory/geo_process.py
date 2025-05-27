"""
    Auxiliary functions for backend logic in views
"""
import requests
import json
import os
from django.conf import settings


NOMINATIM_API = "https://nominatim.openstreetmap.org/search"

def get_city_boundary(city, country=None, save_dir=settings.STATIC_ROOT):
    """
        Retrieves boundaries of city and save to save_dir in FeatureCollection format

        Args:
            city: city name to query
            country: country to which city belongs
            save_dir: directory for saving generated geojson file (defaults to STATIC_ROOT)

        Returns absolute path of generated geojson file
    """
    # Use default directory from settings if none provided
    if save_dir is None:
        save_dir = settings.GEOJSON_DIR
        # Create directory if it doesn't exist
        os.makedirs(save_dir, exist_ok=True)

    query = city
    if country:
        query += f" ,{country}"

    # Query parameters
    params = {
        "q": query,
        "polygon_geojson": 1,
        "format": "json"
    }

    headers = {
        "User-Agent": "geo-boundary-script/1.0"
    }

    response = requests.get(NOMINATIM_API, params=params, headers=headers)
    response.raise_for_status()
    results = response.json()

    # Filter for administrative boundaries
    boundaries = [result for result in results if result.get('class')=='boundary']

    if boundaries:
        # TODO: may need to include all coordinates
        boundary = boundaries[0]

        filename = os.path.join(save_dir, f"{city.lower().replace(' ', '_')}.geojson")
        feature = {
            "type": "Feature",
            "properties": {
                "name": boundary.get('display_name'),
                "osm_id": boundary.get('osm_id')
            },
            "geometry": boundary.get('geojson')
        }

        # Save feature to file
        with open(filename, "w") as f:
            json.dump(feature, f, indent=2)

        return filename
    else:
        return f"No administrative boundary found for {city}. Raw result {results}"

