from django.urls import path
from .views import GenerationConfigView, download_files, Trajectory3DView, MapMatchingView


urlpatterns = [
    path('generate/', GenerationConfigView.as_view(), name='generate'),
    path('generate/ngrams', GenerationConfigView.as_view({'post': 'post_ngrams'})),
    path('download/<str:filename>', download_files, name='download_files'),
    path('analyze/', Trajectory3DView.as_view(), name="analyze"),
    path('map-match/', MapMatchingView.as_view(), name="map_match")
]

