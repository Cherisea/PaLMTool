from django.urls import path
from .views import GenerationConfigView, download_files, compare_trajectory_heatmap


urlpatterns = [
    path('generate/', GenerationConfigView.as_view(), name='generate'),
    path('download/<str:filename>', download_files, name='download_files'),
]

