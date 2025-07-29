"""
    Auxiliary functions for backend logic in views
"""
import pandas as pd
import geopandas as gpd
import numpy as np
from shapely.geometry import Polygon, mapping
from Palmto_gen import ConvertToToken, DisplayTrajs
from timezonefinder import TimezoneFinder
from datetime import datetime
from zoneinfo import ZoneInfo

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

def extract_area_center(gdf):
    """
        Extracts coordinate pair of the center of a map area from a GeoDataFrame 

        gdf: GeoDataFrame returned from extract_boundary function

        Return coordinate pair in (lat, lon) format for leaflet visualization
    """
    centroid = gdf.geometry[0].centroid
    return [float(centroid.y), float(centroid.x)]

def traj_to_geojson(trajectory):
    """
        Convert a list of Shapely points to a GeoJSON feature collection for frontend visualization

        trajectory: Pandas dataframe containing trajectory data. One of its columns must be 
              'geometry', with each of its row being a list of coordinate pairs.
        Return a dictionary in geojson feature collection format
    """
    features = []

    # Randomly select a subset of trajectories
    sample = trajectory['geometry'].sample(frac=0.5, random_state=404).to_list() 

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

def heatmap_geojson(df, area, cell_size=200):
    """
        Prepare heatmap data in a GeoJSON format for frontend visualization

        df: dataframe containing trajectories in list of coordinate pairs
        area: a GeoDataFrame defining the boundary of a geographical area
        cell_size: size of cells in meters

        Return a GeoJSON feature collection with data necessary for plotting a heatmap in frontend
    """
    # Initialize a TokenCreator instance
    TokenCreator = ConvertToToken(df, area, cell_size)
    grid, _, num_cells = TokenCreator.create_grid()

    # Merge grid with Shapely points in df
    display_traj_tmp = DisplayTrajs([], [])
    merged_df = display_traj_tmp.merge_grid_with_points(grid, df, num_cells)

    # Get point counts in each region
    valid_df = merged_df[merged_df['point_region'] != 'nan']
    polygon_counts = valid_df['point_region'].value_counts()

    # Normalize counts using a approach similar to matplotlib
    if len(polygon_counts) > 0:
        max_count = polygon_counts.max()
        min_count = polygon_counts.min()
    else:
        max_count = 1
        min_count = 0

    # Construct feature array
    features = []
    for _, region in grid.iterrows():
        count = polygon_counts.get(region['geometry'], 0)

        normalized = (count - min_count) / (max_count - min_count)

        feature = {
            'type': 'Feature',
            'properties': {
                'count': int(count),
                'normalized': float(normalized),
            },
            'geometry': mapping(region['geometry'])
        }
        features.append(feature)

    return {
        'type': 'FeatureCollection',
        'features': features,
        'maxCount': int(max_count)
    }

def convert_time(df, lon, lat):
    """
        Convert timestamps formatted as epoch Unix timestamp in seconds to a local time
        indicated by geographical coordinates

        df: dataframe with a timestamp column in epoch Unix format
        lat: latitude of the center of a region
        lon: longitude of the center of a region

        Returns modified dataframe with timestamp column represented by a 24-hour formatted time 
    """
    # Obtain timezone from coords
    tz = TimezoneFinder()
    timezone = tz.timezone_at(lng=lon, lat=lat)

    if not timezone:
        raise ValueError(f"Could not find timezone for coordiates Lon: {lon}, Lat: {lat}")

    df['timestamp'] = df['timestamp'].apply(lambda x: 
                                            datetime.fromtimestamp(x, tz=ZoneInfo(timezone)).strftime("%d/%m/%Y %H:%M:%S"))

    return df



