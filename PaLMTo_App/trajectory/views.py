# REST API
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

# Django libraries
from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.core.files.uploadedfile import SimpleUploadedFile, InMemoryUploadedFile

# System libraries
import os
import uuid
from io import StringIO
from contextlib import redirect_stdout

# Third-party libraries
import ast
import pickle
import requests
import pandas as pd
import geopandas as gpd
from datetime import datetime, timedelta
from Palmto_gen import ConvertToToken, NgramGenerator, TrajGenerator

# Local imports
from .models import GeneratedTrajectory
from .serializers import GenerationConfigSerializer
from .geo_process import extract_boundary, traj_to_geojson, extract_area_center, heatmap_geojson, convert_time

# Holds statistics related to trajectory generation
STATS = {}

class GenerationConfigView(APIView):
    """
        A class for processing frontend form and sending back data related to trajectory generation 
        using PaLMTo_gen library.
    """
     # Specify parser of HMTL forms and file uploads for Django REST Framework
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        """Handler of processing the entire two-stage trajectory generation process.

        Args:
            request(rest_framework.request.Request): an object containing cache_file field.

        Returns:

        """
        data = request.data
        uploaded = self.save_record(data)

        # serializer = GenerationConfigSerializer(data=data)
        # if serializer.is_valid():
        #     uploaded = serializer.save()
        global STATS

        sentence_df, study_area, _, new_trajs_gdf = self. _process_traj_generation(data)
        # generated_file = self.save_trajectory(new_trajs, uploaded)
        visual_data = self.generate_trajectory_visual(sentence_df, new_trajs_gdf, study_area)
        heatmap_data = self.compare_trajectory_heatmap(sentence_df, new_trajs_gdf,
                                                    study_area, int(data["num_trajectories"]))
        
        return Response({'visualization': visual_data,
                          'heatmap': heatmap_data,}, status=status.HTTP_201_CREATED)

        # return Response({'id': uploaded.id, 
        #                     'generated_file': generated_file,
        #                     'visualization': visual_data,
        #                     'heatmap': heatmap_data,
        #                     'stats': STATS}, status=status.HTTP_201_CREATED)
        # return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) 
    
    def save_record(self, data):
        model_data = {}
        model_data['file'] = data['file']
        model_data['cell_size'] = data['cell_size']
        model_data["num_trajectories"] = data["num_trajectories"]

        if data.get("generation_method") == "length_constrained":
            model_data['generation_method'] = "length_constrained"
            model_data["trajectory_len"] = int(data["trajectory_len"])
        else:
            model_data['generation_method'] = "point_to_point"
        
        serializer = GenerationConfigSerializer(data=model_data)
        if serializer.is_valid():
            uploaded = serializer.save()
        
        return uploaded


    def _process_cache(self, data):
        """Read cache file and extract pickled Python objects.

        Args:
            data(QueryDict):

        Returns:
             tuple: original Python objects required for the second step of trajectory generation.
        
        """
        cache_file = data.get('cache_file')

        if not cache_file:
            raise ValueError("No ngram file provided.")
        
        if isinstance(cache_file, str):
            # Open from disk if it's a filename    
            full_path = os.path.join(settings.MEDIA_ROOT, "cache", cache_file)
            if not os.path.exists(full_path):
                raise FileNotFoundError(f"Ngram file {cache_file} not found.")
            # Read cache file
            with open(full_path, 'rb') as f:
                cached_data = pickle.load(f)
        elif isinstance(cache_file, InMemoryUploadedFile):
            # Read directly if it's an uploaded file
            cached_data = pickle.load(cache_file)
        else:
            raise ValueError("Invalid cache file type.")

        # Extract all cached data
        ngrams = cached_data['ngrams']
        start_end_points = cached_data['start_end_points']
        grid = cached_data['grid']
        sentence_df = cached_data['sentence_df']
        study_area = cached_data['study_area']

        return ngrams, start_end_points, grid, sentence_df, study_area
    
    def _process_traj_generation(self, data):
        """Generate new trajectories based on cached n-gram data and user-supplied parameters.

        This method loads cached n-gram data and related objects and generate new trajectories 
        based on parameters users specified in frontend form.

        Args:
            data (dict): Dictionary containing user-specified parameters, including:
                - "num_trajectories" (str or int): Number of trajectories to generate.
                - "generation_method" (str): Method for trajectory generation ("length_constrained" or other).
                - "trajectory_len" (int, optional): Desired trajectory length (required if using "length_constrained").
                - "cache_file" (str): Filename of the cached n-gram data.
        
        Returns:
            tuple:
                - sentence_df (pandas.DataFrame): DataFrame of original trajectories as sentences.
                - study_area (geopandas.GeoDataFrame): GeoDataFrame defining the study area's boundary.
                - new_trajs (pandas.DataFrame): an object of generated trajectories.
                - new_trajs_gdf (geopandas.GeoDataFrame): GeoDataFrame of generated trajectories for visualization.
        """
        num_trajs = int(data.get("num_trajectories"))
        ngrams, start_end_points, grid, sentence_df, study_area = self._process_cache(data)


        if data.get("generation_method") == "length_constrained":
            traj_len = int(data.get("trajectory_len"))
            traj_generator = TrajGenerator(ngrams, start_end_points, num_trajs, grid)
            new_trajs, new_trajs_gdf = traj_generator.generate_trajs_using_origin(traj_len, seed=None)
        else:
            traj_generator = TrajGenerator(ngrams, start_end_points, num_trajs, grid)
            new_trajs, new_trajs_gdf = traj_generator.generate_trajs_using_origin_destination()
        return sentence_df, study_area, new_trajs, new_trajs_gdf
 
    def save_trajectory(self, trajs, config_instance, save_dir="generated"):
        """
            Save generated trajectories to local machine as well as database table.

            trajs: trajectory data formatted as a list of coordinate pairs
            config_instance: foreign key of GeneratedTrajecotry table
            save_dir: media sub-folder for saving trajectory files

            Return filename of saved trajectory. 
        """

        # Form a unique file name for generated trajectories
        file_id = uuid.uuid4()
        filename = f'generated_trajectories_{file_id}.csv'
        subdir = os.path.join(settings.MEDIA_ROOT, save_dir)
        file_path = os.path.join(subdir, filename)

        os.makedirs(subdir, exist_ok=True)
        # Save files to server file system
        trajs.to_csv(file_path, index=False)

        # Save files to a database table
        generated_traj = GeneratedTrajectory(config=config_instance, generated_file=file_path)
        generated_traj.save()

        return filename

    def generate_trajectory_visual(self, df, new_trajs_gdf, study_area):
        """
            Prepare trajectory data for frontend visualization

            df: original dataframe formatted as lists of Shapely points
            new_trajs_gdf: GeoDataFrame generated trajectories as lists of Shapely points
            study_area: a GeoDataFrame defining geographical boundary of an area

            Return a dictionary containing GeoJSON data for original and generated trajectories, along with
            the center of study area
        """
        # Convert trajectory data to geojson for frontend visualization
        original = traj_to_geojson(df)
        generated = traj_to_geojson(new_trajs_gdf)
        center = extract_area_center(study_area)

        return {"original": original, "generated": generated, "center": center}

    def compare_trajectory_heatmap(self, df, new_trajs_gdf, study_area, sample):
        """
            Prepare trajectory data for frontend heatmap 
        
            sample: a subset of df trajectories for visualization 

            Return a dictionary containg heatmap data for original and generated trajectories, center of study
            area and its bounds
        """
        original_heatmap = heatmap_geojson(df.sample(sample), study_area)
        generated_heatmap = heatmap_geojson(new_trajs_gdf.sample(sample), study_area)

        bounds = study_area.total_bounds
        center = extract_area_center(study_area)

        return {
                'original': original_heatmap,
                'generated': generated_heatmap,
                'center': center,
                'bounds': [[bounds[1], bounds[0]], [bounds[3], bounds[2]]]  # [[miny, minx], [maxy, maxx]]
            }

class NgramGenerationView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        """Handler for processing the first step of building ngram dictionary.
        
        Returns:
            rest_framework.response.Response: A response containing the cache file name and statistics, 
            with HTTP 200 status on success.
        
        """
        data = request.data
        cell_size = int(data['cell_size'])
        uploaded_file = data['file']
        ngrams, start_end_points, grid, sentence_df, study_area = _process_to_ngrams(data)
        
        cached_data = {
            'ngrams': ngrams,
            'start_end_points': start_end_points,
            'grid': grid,
            'sentence_df': sentence_df,
            'study_area': study_area,
            'cell_size': cell_size,
            'uploaded_file': uploaded_file,
            'created_at': datetime.now().isoformat()
        }

        filename = f'cache_{cell_size}.pkl'
        subdir = os.path.join(settings.MEDIA_ROOT, "cache")
        os.makedirs(subdir, exist_ok=True)

        file_path = os.path.join(subdir, filename)
        with open(file_path, "wb") as f:
            pickle.dump(cached_data, f)

        return Response({
                "cache_file": filename,
                'stats': STATS,
            }, status=status.HTTP_200_OK)
    
class Trajectory3DView(APIView):
    """
        A class for handling frontend request that renders 3D visualization 
        view of timestamped trajectory trail.
    """
    def get(self, request):
        # TODO: replace demo file with dynamically generated file
        df = pd.read_csv('demo.csv')
        processed_data = self.prepare_3d_data(df)

        return Response(processed_data, status=status.HTTP_200_OK)
        

    def prepare_3d_data(self, df):
        """
            Convert trajectory data to 3D format with temporal info
        """
        features = []

        # Convert Unix timestamp to local time
        region = extract_boundary(df)
        centroid = extract_area_center(region)
        df = convert_time(df, centroid.x, centroid.y)

        for _, row in df.iterrows():
            start_time_str = row['timestamp']
            start_time = datetime.strptime(start_time_str, '%d/%m/%Y %H:%M:%S')

            # Parse geometry column
            geometry = ast.literal_eval(row['geometry'])

            # Create time-stamped coordinates with 15s interval
            coords_with_time = []
            for i, point in enumerate(geometry):
                point_time = start_time + timedelta(seconds=i * 15)

                # Create 3d data point
                coords_with_time.append((
                    point[0],
                    point[1],
                    point_time.isoformat()
                ))

            features.append({
                'type': 'Feature',
                'properties': {
                    'trajectory_id': row.get('trip_id', f'traj_{len(features)}'),
                    'start_time': start_time.isoformat(),
                    'end_time': coords_with_time[-1][2]
                },
                'geometry': {
                    'type': 'LineString',
                    'coordinates': coords_with_time
                }
            })
        
        # Return result in GoeJSON format
        return {
            'type': 'FeatureCollection',
            'features': features
        }

class MapMatchingView(APIView):
    """
        A class for mapping trajectory trip to actual road network
    """
    def post(self, request):
        # Get file name from request
        file_name = request.data.get('filename')
        percentage = request.data.get('percentage', 1.0)

        if not file_name:
            return Response({"Error": "No file name provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get full file path
        file_path = os.path.join(settings.MEDIA_ROOT, "generated", file_name)

        if not os.path.exists(file_path):
            return Response({"Error": f"File {file_path} not found"}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            matched_trajs = []
            df = pd.read_csv(file_path)
            df['geometry'] = df['geometry'].apply(ast.literal_eval)
            sub_df = df.sample(frac=percentage/100, random_state=404)

            for _, row in sub_df.iterrows():
                traj = row['geometry']

                # Convert trajectory into OSRM-complaint format
                traj_trip = []
                for coord in traj:
                    traj_trip.append(f"{coord[0]},{coord[1]}")
                osrm_str = ";".join(traj_trip)
                osrm_url = "http://router.project-osrm.org/match/v1/driving/"
                full_url = f"{osrm_url}{osrm_str}?overview=full&annotations=true&geometries=geojson"

                # Make request to OSRM
                response = requests.get(full_url, timeout=10)

                if response.status_code == 200:
                    matched_data = response.json()

                    if 'matchings' in matched_data and matched_data['matchings']:
                        matching = matched_data['matchings'][0]

                        # Create GeoJSON feature for frontend
                        matched_feature = {
                            'type': 'Feature',
                            'properties': {
                                'trip_id': row['trip_id'],
                                'confidence': matching.get('confidence', 0),
                                'distance': matching.get('distance', 0),
                                'duration': matching.get('duration', 0)
                            },
                            'geometry': matching['geometry']
                        }
                        matched_trajs.append(matched_feature)

            matched_filename = self.save_matched_trajs(matched_trajs)
            map_data = {'type': 'FeatureCollection', 'features': matched_trajs}

            return Response({
                'map_data': map_data,
                'output_file': matched_filename
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"Error": f"Failed to process {file_name}: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    def save_matched_trajs(self, matched_data, save_dir="matched"):
        """
            Save trajectories snapped to actual roads in a csv file.

            matched_data: GeoJSON feature collection data with matched trajectories and
                          related attributes
            save_dir: media sub-folder for saving csv file 
        """
        file_id = uuid.uuid4()
        out_filename = f'matched_trajectories_{file_id}.csv'
        subdir = os.path.join(settings.MEDIA_ROOT, save_dir)

        os.makedirs(subdir, exist_ok=True)
        full_path = os.path.join(subdir, out_filename)

        csv_data = []
        for feature in matched_data:
            trip_id = feature['properties']['trip_id']
            confidence = feature['properties']['confidence']
            distance = feature['properties']['distance']
            duration = feature['properties']['duration']

            coords = feature['geometry']['coordinates']
            geometry_str = str(coords)

            csv_data.append({
                "trip_id": trip_id,
                "confidence": confidence,
                "distance": distance,
                "duration": duration,
                "geometry": geometry_str
            })

        df = pd.DataFrame(csv_data)
        df.to_csv(full_path, index=False)

        return out_filename

# Function-based view
def download_files(request, filename):
    """
        Download files from the server

        filename: name of file to be downloaded
    """
    # Check if files existly directly in root folder
    full_path = os.path.join(settings.MEDIA_ROOT, filename)

    if not os.path.exists(full_path):
        # Go to sub-dir if not found in root
        subdirs = ["generated", "matched", "cache"]
        for subdir in subdirs:
            full_path = os.path.join(settings.MEDIA_ROOT, subdir, filename)
            if os.path.exists(full_path):
                break

    if os.path.exists(full_path):
        response = FileResponse(open(full_path, "rb"))
        response['Content-Disposition'] = f"attachment; filename={filename}"
        response['Content-Type'] = 'text/csv'
        return response
    else:
        return HttpResponse("File not found", status=404)
    
        """Handle file upload field in frontend form.

        Inject demo trajectory file into request if value of file field is empty. Otherwise, return
        request data unchanged. 

        Args:
            request(rest_framework.request.Request): not the same as HttpRequest.

        Returns:
            data(django.QueryDict): same as input or a modified object with demo file inserted.
        
        """
        data_copy = request.data.copy()
        file = data_copy.get('file')

        # Construct default file if it's missing
        if not file:
            demo_filepath = os.path.join(settings.MEDIA_ROOT, 'demo.csv')
            # Read file content
            with open(demo_filepath, "rb") as f:
                file_content = f.read()
                data_copy['file'] = SimpleUploadedFile(
                    'demo.csv', file_content, 'text/csv'
                )

        return data_copy

def _process_to_ngrams(data):
        """Execute trajectory generation process up to creation of ngram dictionaries.

        This is the first step of a two-stage trajectory generation process, allowing a user to optionally 
        build ngrams dictionary without executing the entire program and to skip this time-consuming step 
        if a JSON file storing a previously built ngrams is provided. 

        Args:
            data(django.QueryDict): dictionary-like object containing keys and values from frontend form.

        Returns:

        """
        global STATS

        # Cast value of integer fields as Python integer
        cell_size = int(data['cell_size'])

        # Reset file pointer
        data['file'].seek(0)
        df = pd.read_csv(data["file"])
        # Convert geometry column to Python list
        df['geometry'] = df['geometry'].apply(ast.literal_eval)
        study_area = extract_boundary(df)

        TokenCreator = ConvertToToken(df, study_area, cell_size=cell_size)

        # Capture stdout from create_tokens method
        f = StringIO()
        with redirect_stdout(f):
            grid, sentence_df = TokenCreator.create_tokens()
        content = f.getvalue()
        STATS["cellsCreated"] = int(content.strip().split(":")[1])

        ngram_model = NgramGenerator(sentence_df)

        # Capture stdout from create_ngrams method
        f.seek(0)
        with redirect_stdout(f):
            ngrams, start_end_points = ngram_model.create_ngrams()
        content = f.getvalue()
        STATS["uniqueBigrams"] = int(content.split("\n")[1].split(":")[1])
        STATS["uniqueTrigrams"] = int(content.split("\n")[2].split(":")[1])

        return ngrams, start_end_points, grid, sentence_df, study_area
