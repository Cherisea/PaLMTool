from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import UploadedTrajectorySerializer, GeneratedTrajectorySerializer, GenerationConfigSerializer
from .models import UploadedTrajectory, GeneratedTrajectory
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import os

class UploadTrajectoryView(APIView):
    # Specify parser of HMTL forms and file uploads for Django REST Framework
    parser_classes = [MultiPartParser, FormParser]

    # Define custom post method
    def post(self, request):
        # Try to retrieve file from request
        file = request.FILES.get('original_file')

        # Create a new instance 
        if file:
            serializer = UploadedTrajectorySerializer(data={'original_file': file})
            if serializer.is_valid():
                uploaded = serializer.save()
                return Response({'id': uploaded.id}, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        # Use default demo file
        else:
            demo_filepath = os.path.join(settings.MEDIA_ROOT, 'demo.csv')
            # Create database record directly when no validation is needed
            uploaded = UploadedTrajectory.objects.create(original_file=demo_filepath)
            return Response({'id': uploaded.id, 'note': 'Demo mode'}, status=status.HTTP_201_CREATED)

class GenerateTrajectoryView(APIView):
    def post(self, request):
        uploaded_id  = request.data.get('uploaded_id')
        method = request.data.get('generation_method')

        if method not in ['length_constrained', 'point_to_point']:
            return Response({'error': 'Invalid generation method'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Retrieve corresponding original file
        try:
            uploaded = UploadedTrajectory.objects.get(id=uploaded_id)
        except:
            return Response({'error': 'Uploaed trajectory not found'}, status=status.HTTP_404_NOT_FOUND)
        
        #=============== TODO: Generate Trajectories and Return Response================

class ListGeneratedTrajectoryView(APIView):
    # Extract URL path params for GET request
    def get(self, request, *args, **kwargs):
        uploaded_id = kwargs.get('uploaded_id')

        if uploaded_id is None:
            return Response(
                {"error": "uploaded_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        trajectories = GeneratedTrajectory.objects.filter(uploade_id=uploaded_id)
        serializer = GeneratedTrajectorySerializer(trajectories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class GenerationConfigView(APIView):
    def post(self, request):
        serializer = GenerationConfigSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)