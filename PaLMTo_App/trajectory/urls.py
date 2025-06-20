from django.urls import path
from .views import GenerationConfigView, download_files, Trajectory3DView


urlpatterns = [
    path('generate/', GenerationConfigView.as_view(), name='generate'),
    path('download/<str:filename>', download_files, name='download_files'),
    path('analyze', Trajectory3DView.as_view(), name="analyze")
]

