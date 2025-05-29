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
from .geo_process import extract_boundary
import geopandas as gpd
import pandas as pd
from Palmto_gen import ConvertToToken, NgramGenerator, TrajGenerator
import uuid
import ast

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
            generated_file = _generate_trajectory(data, uploaded)
            return Response({'id': uploaded.id, 'generated_file': generated_file}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# class ListGeneratedTrajectoryView(APIView):
#     # Extract URL path params for GET request
#     def get(self, request, *args, **kwargs):
#         config_id = kwargs.get('config')

#         if config_id is None:
#             return Response(
#                 {"error": "config_id is required."},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         trajectories = GeneratedTrajectory.objects.filter(config=config_id)
#         serializer = GeneratedTrajectorySerializer(trajectories, many=True)
#         return Response(serializer.data, status=status.HTTP_200_OK)

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
    
def _generate_trajectory(data, config_instance, save_dir=settings.MEDIA_ROOT):
    """
        Generate realistic trajectories from a sample trajectory file

        data: QueryDict object containing form data
        config_instance: an instance of GenerationConfig model
        save_dir: directory to save generated files to
    """
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
    grid, sentence_df = TokenCreator.create_tokens()

    ngram_model = NgramGenerator(sentence_df)
    ngrams, start_end_points = ngram_model.create_ngrams()

    if data["generation_method"] == "length_constrained":
        traj_len = int(data["trajectory_len"])
        traj_generator = TrajGenerator(ngrams, start_end_points, num_trajs, grid)
        new_trajs, new_trajs_gdf = traj_generator.generate_trajs_using_origin(traj_len, seed=None)
    else:
        traj_generator = TrajGenerator(ngrams, start_end_points, num_trajs, grid)
        new_trajs, new_trajs_gdf = traj_generator.generate_trajs_using_origin_destination()
    
    # Form a unique file name for generated trajectories
    file_id = uuid.uuid4()
    filename = f'generated_trajectories_{file_id}.csv'
    file_path = os.path.join(save_dir, filename)

    # Save files to server file system
    new_trajs.to_csv(file_path)

    # Save files to a database table
    generated_traj = GeneratedTrajectory(config=config_instance, generated_file=file_path)
    generated_traj.save()

    return filename