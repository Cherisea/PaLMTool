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
from ntpath import isdir
import os
from pathlib import Path 

HOME = Path.home()
DATA_DIR = HOME / "Downloads" / "T-drive" / "taxi_traj"

def ingest_from_dir(dir_path):
    if not os.path.isdir(dir_path):
        raise FileNotFoundError(f"Path {dir_path} is not a directory. Please check.")
    
    for file in os.listdir(dir_path):
        if file.endswith('txt'):
            continue
    
    return None



