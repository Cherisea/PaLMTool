"""This script is not part of our trajectory generation process with PaLMTo library. 
It builds a data ingestion pipeline designed to load data from various sources into
a format our model can consume.

Sources of sample data files include:
- Geolife(Microsoft research): collected from 182 users over a period of over three years. It contains a total distace 
    of 1.2 million kilometers with around 25 million points. 
    Link to dataset: https://www.microsoft.com/en-us/research/publication/geolife-gps-trajectory-dataset-user-guide/
- T-drive(Microsoft research): one-week trajectories of 10,357 taxis. Total number of points sums to 15 million with
    a total distance of 9 million kilometers.
    Link to dataset: https://www.microsoft.com/en-us/research/publication/t-drive-trajectory-data-sample/
- Astana: bus operation trajectories sampled in Astana city containing over 61 million points.
    Link to dataset: https://zenodo.org/records/15769359
"""
import csv
from ntpath import isdir
import os
from pathlib import Path
from re import A 

HOME = Path.home()
DATA_DIR = HOME / "Downloads" / "T-drive" / "taxi"

def ingest_from_dir(dir_path, output_csv):
    """Collect data from a given directory and loads them into a 
        csv file that can be consumed by our ngram model.
       
        Args:
            dir_path: path to dataset directory
            output_csv: name of output csv file
    """
    if not os.path.isdir(dir_path):
        raise FileNotFoundError(f"Path {dir_path} is not a directory. Please check.")
    
    # Load individual points into a sequence of points
    all_trips =[]
    for file_name in os.listdir(dir_path):
        if file_name.endswith('txt'):
            trip = []
            trip_id = int(file_name.split(".")[0])
            file_path = os.path.join(dir_path, file_name)

            with open(file_path, 'r') as f:
                lines = f.readlines()
            
            for line in lines:
                parts = line.strip().split(',')
                if len(parts) >= 4:
                    lon, lat = float(parts[2]), float(parts[3])
                    if -180 <= lon <= 180 and 0 <= lat <= 90:
                        trip.append([lon, lat])
            
            if len(trip) >= 3:
                all_trips.append({
                    'trip_id': trip_id,
                    'geometry': trip 
                })
    
    # Write trips to csv file
    with open(output_csv, 'w') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=["trip_id", "geometry"])
        writer.writeheader()
        writer.writerows(all_trips)     
    
ingest_from_dir(DATA_DIR, "demo.csv")



