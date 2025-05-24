from django.contrib import admin
from .models import UploadedTrajectory, GeneratedTrajectory, GenerationConfig

@admin.register(GenerationConfig)
class ConfigAdmin(admin.ModelAdmin):
    list_display = ('id', 'cell_size', 'num_trajectories', 
                    'created_at', 'trajectory_length', 'generation_method', 'file')
    list_filter = ('created_at', 'generation_method', )
    search_fields = ('cell_size', 'num_trajectories', 'trajector_length', )
    ordering = ('-created_at', )

@admin.register(GeneratedTrajectory)
class GeneratedTrajectoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'config', 'generated_file', 'created_at')
    list_filter = ('created_at', )
    search_fields = ('generated_file', )
    ordering = ('-created_at', )

