# REST API
from rest_framework import status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

# Django libraries
from django.views import View
from django.conf import settings
from django.core.files import File
from django.http import FileResponse, HttpResponse, StreamingHttpResponse
from django.core.files.uploadedfile import InMemoryUploadedFile

# System libraries
import os
import uuid
from io import StringIO, BytesIO
from contextlib import redirect_stdout

# Third-party libraries
import ast
import pickle
import json
import threading
import requests
import pandas as pd
from queue import Queue
from datetime import datetime, timedelta
from Palmto_gen import ConvertToToken, NgramGenerator, TrajGenerator

# Local imports
from .models import GeneratedTrajectory
from .serializers import GenerationConfigSerializer
from .geo_process import extract_boundary, traj_to_geojson, extract_area_center, heatmap_geojson, convert_time

# Holds statistics related to trajectory generation
STATS = {}
PROGRESS_QUEUES = {}

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
            response(rest.Response): a tuple consisting of database record id, visualization data,
                heatmap data and name of generated file.
        """
        global STATS
        data = request.data
        uploaded = self.save_to_record(data)

        sentence_df, study_area, new_trajs, new_trajs_gdf = self. _process_traj_generation(data)
        generated_file = self.save_trajectory(new_trajs, uploaded)
        visual_data = self.generate_trajectory_visual(sentence_df, new_trajs_gdf, study_area)
        heatmap_data = self.compare_trajectory_heatmap(sentence_df, new_trajs_gdf,
                                                    study_area, int(data["num_trajectories"]))
        
        return Response({'id': uploaded.id,
                         'visualization': visual_data,
                         'heatmap': heatmap_data,
                         'generated_file': generated_file,}, status=status.HTTP_201_CREATED)
    
    def _process_cache(self, data):
        """Read cache file and extract pickled Python objects.

        Args:
            data(QueryDict): an object sent from frontend request

        Returns:
            cached_data(dict): unpickled data
        
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
            cache_file.seek(0)
            cached_data = pickle.load(cache_file)
        else:
            raise ValueError("Invalid cache file type.")
        
        return cached_data
    
    def _extract_ngrams(self, data):
        """Extract ngrams related data from cache file
        
        """
        cached_data = self._process_cache(data)
        ngrams = cached_data['ngrams']
        start_end_points = cached_data['start_end_points']
        grid = cached_data['grid']
        sentence_df = cached_data['sentence_df']
        study_area = cached_data['study_area']

        return ngrams, start_end_points, grid, sentence_df, study_area

    def _extract_extra_config(self, data):
        """Retrieve user-supplied configurations in step three of form
        
        """
        traj_len = 0
        num_trajs = int(data.get("num_trajectories"))
        if data.get("generation_method") == "length_constrained":
            gen_method = "length_constrained"
            traj_len = int(data.get("trajectory_len"))
        else:
            gen_method = "point_to_point"
        
        return gen_method, num_trajs, traj_len

    def save_to_record(self, data):
        """Save configurations for trajectory generation to local sql database.
        
        """
        model_data = {}

        # Extract data compressed in cache
        cached_data = self._process_cache(data)
        file_path = cached_data['file_path']

        file_obj = open(file_path, "rb")
        recreated_file = File(file_obj, name=cached_data['file_name'])
        
        model_data['file'] = recreated_file
        model_data['cell_size'] = cached_data['cell_size']
        
        # Extract data sent along with request
        gen_method, num_trajs, traj_len = self._extract_extra_config(data)
        model_data['generation_method'] = gen_method
        model_data['num_trajectories'] = num_trajs

        if gen_method == "length_constrained":
            model_data['trajectory_len'] = traj_len
        
        serializer = GenerationConfigSerializer(data=model_data)
        if serializer.is_valid():
            uploaded = serializer.save()
            return uploaded
        else:
            raise serializers.ValidationError(serializer.errors)
    
    def _process_traj_generation(self, data):
        """Generate new trajectories based on cached n-gram data and user-supplied parameters.

        This method loads cached n-gram data and related objects and generate new trajectories 
        based on parameters users specified in frontend form.

        Args:
            data (QueryDict): Dictionary containing user-specified parameters, including:
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
        gen_method, num_trajs, traj_len = self._extract_extra_config(data)
        ngrams, start_end_points, grid, sentence_df, study_area = self._extract_ngrams(data)


        if gen_method == "length_constrained":
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
        """Handler for building ngram dictionary with live updates posted to a client.

        Returns:
            rest_framework.response.Response: a dict containing task id and sever message to client
        """
        # Read content of uploaded file into memory before it's closed
        data = request.data
        uploaded_file = data['file']
        file_name = uploaded_file.name

        # Save uploaded file to disk 
        cache_dir = os.path.join(settings.MEDIA_ROOT, "cache", "uploaded")
        os.makedirs(cache_dir, exist_ok=True)
        file_path = os.path.join(cache_dir, file_name)

        # Process in chunks to avoid memory issues
        with open(file_path, "wb") as out_file:
            for chunk in uploaded_file.chunks():
                out_file.write(chunk)

        # A unique identifier for client to track progress
        task_id = str(uuid.uuid4())

        # Start processing in backend thread
        thread = threading.Thread(
            target=self._process_with_progress,
            args=(data, task_id, file_path, file_name)
        )

        # Allows main process to exit without waiting
        thread.daemon = True
        thread.start()

        return Response({
            "task_id": task_id,
            "message": "Processing started"
        }, status=status.HTTP_202_ACCEPTED)
    
    def _process_with_progress(self, data, task_id, uploaded_file_path):
        """Send live progress updates while orchestrating operations involved in ngram creation.

        """
        try:
            if task_id not in PROGRESS_QUEUES:
                PROGRESS_QUEUES[task_id] = Queue()

            queue = PROGRESS_QUEUES[task_id]

            # Send initial response
            queue.put({
                'type': 'progress',
                'message': 'Starting ngram generation...',
                'progress': 10
            })

            # Process reading uploaded file
            queue.put({
                'type': 'progress',
                'message': 'Reading trajectory file...',
                'progress': 20
            })

            cell_size = int(data['cell_size'])

            # Process token creation
            queue.put({
                'type': 'progress',
                'message': 'Creating tokens and grid...',
                'progress': 40
            })

            ngrams, start_end_points, grid, sentence_df, study_area = self._process_to_ngrams(data, queue, uploaded_file_path)

            # Save cache file
            queue.put({
                'type': 'progress',
                'message': 'Saving cache file...',
                'progress': 90
            })

            cached_data = {
                'ngrams': ngrams,
                'start_end_points': start_end_points,
                'grid': grid,
                'sentence_df': sentence_df,
                'study_area': study_area,
                'cell_size': cell_size,
                'file_path': uploaded_file_path,
                'created_at': datetime.now().isoformat()
            }

            filename = f'cache_{cell_size}.pkl'
            subdir = os.path.join(settings.MEDIA_ROOT, "cache")
            os.makedirs(subdir, exist_ok=True)

            file_path = os.path.join(subdir, filename)
            with open(file_path, "wb") as f:
                pickle.dump(cached_data, f)

            # Send message of completing ngram creation
            queue.put({
                'type': 'complete',
                'message': 'Ngram generation completed successfully!',
                'progress': 100,
                'cache_file': filename,
                'stats': STATS
            })
        except Exception as e:
            if task_id in PROGRESS_QUEUES:
                PROGRESS_QUEUES[task_id].put({
                    'type': 'error',
                    'message': f'Error during processing: {str(e)}'
                })
            
    def _process_to_ngrams(self, data, queue, uploaded_file_path):
        """Generate ngram dictionaries with progress updates
        
        Args:
            uploaded_file_path(str): path of uploaded trajectory file saved in disk
        """
        global STATS

        cell_size = int(data['cell_size'])
        df = pd.read_csv(uploaded_file_path)
        # Convert geometry column to Python list
        df['geometry'] = df['geometry'].apply(ast.literal_eval)
        study_area = extract_boundary(df)

        queue.put({
            'type': 'progress',
            'message': 'Creating token converter...',
            'progress': 50
        })

        TokenCreator = ConvertToToken(df, study_area, cell_size=cell_size)

        # Capture stdout from create_tokens method
        f = StringIO()
        with redirect_stdout(f):
            grid, sentence_df = TokenCreator.create_tokens()
        content = f.getvalue()
        STATS["cellsCreated"] = int(content.strip().split(":")[1])

        queue.put({
            'type': 'progress',
            'message': 'Generating ngrams...',
            'progress': 70
        })

        ngram_model = NgramGenerator(sentence_df)

        # Capture stdout from create_ngrams method
        f.seek(0)
        with redirect_stdout(f):
            ngrams, start_end_points = ngram_model.create_ngrams()
        content = f.getvalue()
        STATS["uniqueBigrams"] = int(content.split("\n")[1].split(":")[1])
        STATS["uniqueTrigrams"] = int(content.split("\n")[2].split(":")[1])

        queue.put({
            'type': 'progress',
            'message': 'Ngrams generation completed!',
            'progress': 85
        })

        return ngrams, start_end_points, grid, sentence_df, study_area
    
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

class ProgressView(View):
    """
        A class for handling Server-Sent Events(SSE) to stream progress updates
    """
    def get(self, request):
        task_id = request.GET.get('task_id')

        if not task_id:
            return Response({"error": "No task_id provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        def event_stream():
            if task_id not in PROGRESS_QUEUES:
                PROGRESS_QUEUES[task_id] = Queue()
            
            queue = PROGRESS_QUEUES[task_id]

            try:
                while True:
                    try:
                        progress_data = queue.get(timeout=30)

                        if progress_data.get('type') == 'complete':
                            yield f"data: {json.dumps(progress_data)}\n\n"
                            break
                        elif progress_data.get('type') == 'error':
                            yield f"data: {json.dumps(progress_data)}\n\n"
                            break
                        else:
                            yield f"data: {json.dumps(progress_data)}\n\n"
                    
                    except Queue.Empty:
                        yield f"data: {json.dumps({'type': 'keepalive'})}\n\n"
            
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            finally:
                # Clean up queue
                if task_id in PROGRESS_QUEUES:
                    del PROGRESS_QUEUES[task_id]
        
        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        
        # Don't cache live updates
        response['Cache-Control'] = 'no-cache'

        return response


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
