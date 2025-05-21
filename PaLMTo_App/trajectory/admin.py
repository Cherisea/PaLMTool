from django.contrib import admin
from .models import UploadedTrajectory, GeneratedTrajectory, GenerationConfig

# Register your models here.
@admin.register(UploadedTrajectory)
class UploadedTrajectoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'uploaded_at', 'original_file')
    search_fields = ('original_file',)
    # Listed in descending order
    ordering = ('-uploaded_at',)

@admin.register(GenerationConfig)
class ConfigAdmin(admin.ModelAdmin):
    list_display = ('id', 'cell_size', 'num_trajectories', 
                    'created_at', 'trajectory_length', 'generation_method')
    list_filter = ('created_at', 'generation_method', )
    search_fields = ('cell_size', 'num_trajectories', 'trajector_length', )
    ordering = ('-created_at', )

@admin.register(GeneratedTrajectory)
class GeneratedTrajectoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'uploaded', 'config', 'generated_file', 'created_at')
    list_filter = ('created_at', )
    search_fields = ('generated_file', )
    ordering = ('-created_at', )

