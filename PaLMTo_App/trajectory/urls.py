from django.urls import path
from .views import GenerationConfigView, download_files, Trajectory3DView, CacheStatsView
from .views import MapMatchingView, NgramGenerationView, ProgressView, rename_cache


urlpatterns = [
    path('generate/', GenerationConfigView.as_view(), name='generate'),
    path('generate/ngrams', NgramGenerationView.as_view(), name='generate_ngrams'),
    path('download/<str:filename>', download_files, name='download_files'),
    path('3d-view/', Trajectory3DView.as_view(), name="3d-view"),
    path('map-match/', MapMatchingView.as_view(), name="map_match"),
    path('progress/', ProgressView.as_view(), name='progress'),
    path('rename-cache/', rename_cache, name='rename_cache'),
    path('get-stats-from-cache/', CacheStatsView.as_view(), name='get-stats-from-cache')
]

