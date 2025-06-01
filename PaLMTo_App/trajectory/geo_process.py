"""
    Auxiliary functions for backend logic in views
"""
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon

def extract_boundary(df):
    """
        Extract geographical boundary of an area from a Pandas dataframe.

        df: dataframe containing a geometry column with a list of lists in each row

        Return a GeoDataFrame with pairs of coordinates representing the boundary of an area
    """
    # Initialize coordinates of bottom left and top right points of an area
    sw = {'log': float('inf'), 'lat': float('inf')}
    ne = {'log': float('-inf'), 'lat': float('-inf')}

    # Update longitude and latitude of both points
    for coords in df['geometry']:
        for lon, lat in coords:
            if lon < sw['log']:
                sw['log'] = lon
            if lon > ne['log']:
                ne['log'] = lon
            if lat < sw['lat']:
                sw['lat'] = lat
            if lat > ne['lat']:
                ne['lat'] = lat

    # Construct a rectangle-shaped polygon delimiting its boundary
    sw_coords = [sw['log'], sw['lat']]
    ne_coords = [ne['log'], ne['lat']]
    nw_coords = [sw['log'], ne['lat']]
    se_coords = [ne['log'], sw['lat']]

    boundary = [sw_coords, nw_coords, ne_coords, se_coords, sw_coords]
    poly = Polygon(boundary)

    return gpd.GeoDataFrame(pd.DataFrame([{"geometry": poly}]), geometry='geometry')    

def traj_to_geojson(trajectory):
    """
        Convert a list of Shapely points to a GeoJSON feature collection for frontend visualization

        trajectory: Pandas dataframe containing trajectory data. One of its columns must be 
              'geometry', with each of its row being a list of coordinate pairs.
        Return a dictionary in geojson feature collection format
    """
    features = []

    # Randomly select a subset of trajectories
    sample = trajectory['geometry'].sample(1000).to_list()

    for traj in sample:
        # GeoJSON coordinate format [lon, lat]
        coords = [[point.x, point.y] for point in traj]
        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': coords
            }
        })

    return {
        'type': 'FeatureCollection',
        'features': features
    }

def extract_area_center(gdf):
    """
        Extracts coordinate pair of the center of a map area from a GeoDataFrame 

        gdf: GeoDataFrame returned from extract_boundary function

        Return coordinate pair in (lat, lon) format for leaflet visualization
    """
    centroid = gdf.geometry[0].centroid
    return [centroid.y, centroid.x]
