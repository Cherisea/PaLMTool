"""
    Convert Django Model instances to JSON object 
"""

from rest_framework import serializers
from .models import UploadedTrajectory, GeneratedTrajectory

class UploadedTrajectorySerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedTrajectory
        fields = ['id', 'uploaded_at', 'original_file']

class GeneratedTrajectorySerializer(serializers.ModelSerializer):
    uploaded = UploadedTrajectorySerializer(read_only=True)

    class Meta:
        model = GeneratedTrajectory
        fields = ['id', 'uploaded', 'generated_file', 'generation_method', 'created_at']