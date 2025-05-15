from django.urls import path
from .views import GenerationConfigView


urlpatterns = [
    path('config/set', GenerationConfigView.as_view(), name='config-set')
]

