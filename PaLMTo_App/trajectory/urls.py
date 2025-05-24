from django.urls import path
from .views import GenerationConfigView


urlpatterns = [
    path('generate/', GenerationConfigView.as_view(), name='generate')
]

