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
from .geo_process import extract_boundary, traj_to_geojson, extract_area_center, heatmap_geojson
import pandas as pd
from Palmto_gen import ConvertToToken, NgramGenerator, TrajGenerator
import uuid
import ast
from io import StringIO
from contextlib import redirect_stdout

STATS = {}

class GenerationConfigView(APIView):
     # Specify parser of HMTL forms and file uploads for Django REST Framework
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # Create a mutable copy of QueryDict object
        data = request.data.copy()
        file = data.get('file')

        # Append default file to request if it's missing
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

            sentence_df, study_area, new_trajs, new_trajs_gdf = _process_config(data)
            generated_file = save_trajectory(new_trajs, uploaded)
            visual_data = generate_trajectory_visual(sentence_df, new_trajs_gdf, study_area)
            heatmap_data = compare_trajectory_heatmap(sentence_df, new_trajs_gdf,
                                                      study_area, int(data["num_trajectories"]))

            return Response({'id': uploaded.id, 
                             'generated_file': generated_file,
                             'visualization': visual_data,
                             'heatmap': heatmap_data,
                             'stats': STATS}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
    
def _process_config(data):
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
    
def save_trajectory(trajs, config_instance, save_dir=settings.MEDIA_ROOT):
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

def generate_trajectory_visual(df, new_trajs_gdf, study_area):
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

def compare_trajectory_heatmap(df, new_trajs_gdf, study_area, sample):
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
