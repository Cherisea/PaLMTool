from django.urls import path
from . import views

app_name = 'trajectory'

urlpatterns = [
    # Add your API endpoints here
    path('api/trajectory/', views.trajectory_list, name='trajectory_list'),
    path('api/trajectory/<int:pk>/', views.trajectory_detail, name='trajectory_detail'),
]
