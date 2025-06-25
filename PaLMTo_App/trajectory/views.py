from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import GenerationConfigSerializer
from .models import GeneratedTrajectory
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import os
from django.core.files.uploadedfile import SimpleUploadedFile
from django.http import FileResponse
from .geo_process import extract_boundary, traj_to_geojson, extract_area_center, heatmap_geojson, convert_time
import pandas as pd
from Palmto_gen import ConvertToToken, NgramGenerator, TrajGenerator
import uuid
import ast
from io import StringIO
from contextlib import redirect_stdout
from datetime import datetime, timedelta
import requests

# Holds statistics related to trajectory generation
STATS = {}

class GenerationConfigView(APIView):
    """
        A class for processing frontend form and sending back data related to trajectory generation 
        using PaLMTo_gen library
    """
     # Specify parser of HMTL forms and file uploads for Django REST Framework
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        data = request.data.copy()
        file = data.get('file')

        # Construct default file if it's missing
        if not file:
            demo_filepath = os.path.join(settings.MEDIA_ROOT, 'demo.csv')
            # Read file content
            with open(demo_filepath, "rb") as f:
                file_content = f.read()
                data['file'] = SimpleUploadedFile(
                    'demo.csv', file_content, 'text/csv'
                )

        serializer = GenerationConfigSerializer(data=data)
        if serializer.is_valid():
            uploaded = serializer.save()
            global STATS

            sentence_df, study_area, new_trajs, new_trajs_gdf = self._process_config(data)
            generated_file = self.save_trajectory(new_trajs, uploaded)
            visual_data = self.generate_trajectory_visual(sentence_df, new_trajs_gdf, study_area)
            heatmap_data = self.compare_trajectory_heatmap(sentence_df, new_trajs_gdf,
                                                      study_area, int(data["num_trajectories"]))

            return Response({'id': uploaded.id, 
                             'generated_file': generated_file,
                             'visualization': visual_data,
                             'heatmap': heatmap_data,
                             'stats': STATS}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) 
        
    def _process_config(self, data):
        """
            Process data sent from frontend form.
        
            data: QueryDict object containing form data
            
            Return a dataframe representing trajectory as a "sentence", a GeoDataFrame defining geographical boundary,
            generated trajectories as a list of coordinate pairs and generated trajectories as Shapely point for 
            visualization
        """
        global STATS

        # Cast value of integer fields as Python integer
        cell_size = int(data['cell_size'])
        num_trajs = int(data["num_trajectories"])

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

        if data["generation_method"] == "length_constrained":
            traj_len = int(data["trajectory_len"])
            traj_generator = TrajGenerator(ngrams, start_end_points, num_trajs, grid)
            new_trajs, new_trajs_gdf = traj_generator.generate_trajs_using_origin(traj_len, seed=None)
        else:
            traj_generator = TrajGenerator(ngrams, start_end_points, num_trajs, grid)
            new_trajs, new_trajs_gdf = traj_generator.generate_trajs_using_origin_destination()
        return sentence_df, study_area, new_trajs, new_trajs_gdf
        
    def save_trajectory(self, trajs, config_instance, save_dir=settings.MEDIA_ROOT):
        """
            Save generated trajectories to local machine as well as database table.

            trajs: trajectory data formatted as a list of coordinate pairs
            config_instance: foreign key of GeneratedTrajecotry table
            save_dir: local directory for saving trajectory files to

            Return filename of saved trajectory. 
        """

        # Form a unique file name for generated trajectories
        file_id = uuid.uuid4()
        filename = f'generated_trajectories_{file_id}.csv'
        file_path = os.path.join(save_dir, filename)

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

        if not file_name:
            return Response({"Error": "No file name provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get full file path
        file_path = os.path.join(settings.MEDIA_ROOT, file_name)

        if not os.path.exists(file_path):
            return Response({"Error": f"File {file_path} not found"}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            matched_trajs = []
            df = pd.read_csv(file_path)
            df['geometry'] = df['geometry'].apply(ast.literal_eval)

            for _, row in df.iterrows():
                traj = row['geometry']

                # Convert trajectory into OSRM-complaint format
                traj_trip = []
                for coord in traj:
                    traj_trip.append(f"{coord[0]},{coord[1]}")
                osrm_str = ";".join(traj_trip)
                osrm_url = "http://router.project-osrm.org/match/v1/driving/"
                full_url = f"{osrm_url}{osrm_str}?overview=full&annotations=true&geometries=geojson"

                # Make request to OSRM
                response = requests.get(full_url)

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

            return Response({
                'type': 'FeatureCollection',
                'features': matched_trajs
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"Error": f"Failed to process {file_name}: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


# Function-based view
def download_files(request, filename):
    """
        Download files from the server

        filename: name of file to be downloaded
    """
    path = os.path.join(settings.MEDIA_ROOT, filename)
    if os.path.exists(path):
        response = FileResponse(open(path, "rb"))
        response['Content-Disposition'] = f"attachment; filename={filename}"
        response['Content-Type'] = 'text/csv'
        return response
    else:
        return Response("File not found", status=status.HTTP_404_NOT_FOUND)