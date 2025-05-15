"""
    Convert Django Model instances to JSON object 
"""

import csv
import io
from rest_framework import serializers
from .models import UploadedTrajectory, GeneratedTrajectory, GenerationConfig

class UploadedTrajectorySerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedTrajectory
        fields = ['id', 'uploaded_at', 'original_file']

    def validate(self, file):
        """
            Check if uploaded file is a csv file with three columns:
            ['trip_id', 'timestamp', 'geometry']
        """
        if not file.name.endswith('.csv'):
            raise serializers.ValidationError("File must be a .csv")
        
        try:
            content = file.read.decode('utf-8')
            file.seek(0)

            # Convert string to a file object and pass it to reader
            csv_reader = csv.reader(io.StringIO(content))
            header = next(csv_reader)

            expected = ['trip_id', 'timestamp', 'geometry']
            if header != expected:
                raise serializers.ValidationError(f"CSV header must be exactly {expected}.")
        except Exception as e:
            raise serializers.ValidationError(f"Failed to read file: {str(e)}")
        
        return file

class GenerationConfigSerializer(serializers.ModelSerializer):
    # uploaded = UploadedTrajectorySerializer(read_only=True)
    # uploaded = serializers.PrimaryKeyRelatedField(queryset=UploadedTrajectory.objects.all())

    class Meta:
        model = GenerationConfig
        fields='__all__'

class GeneratedTrajectorySerializer(serializers.ModelSerializer):
    uploaded = UploadedTrajectorySerializer(read_only=True)
    config = GenerationConfigSerializer(read_only=True)

    class Meta:
        model = GeneratedTrajectory
        fields = ['id', 'uploaded', 'config', 'generated_file', 'created_at']

