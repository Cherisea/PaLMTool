from django.contrib import admin
from .models import UploadedTrajectory, GeneratedTrajectory

# Register your models here.
@admin.register(UploadedTrajectory)
class UploadedTrajectoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'uploaded_at', 'original_file')
    search_fields = ('original_file',)
    # Listed in descending order
    ordering = ('-uploaded_at')

@admin.register(GeneratedTrajectory)
class GeneratedTrajectoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'uploaded', 'generation_method', 'generated_file', 'created_at')
    list_filter = ('generation_method', 'created_at')
    search_fields = ('generated_file', )
    ordering = ('-created_at', )

