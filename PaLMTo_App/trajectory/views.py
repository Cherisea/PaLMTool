from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

# Create your views here.

@csrf_exempt
@require_http_methods(["GET", "POST"])
def trajectory_list(request):
    if request.method == "GET":
        # Handle GET request - return list of trajectories
        return JsonResponse({
            "message": "List of trajectories",
            "data": []  # Add your trajectory data here
        })
    
    elif request.method == "POST":
        # Handle POST request - create new trajectory
        try:
            data = json.loads(request.body)
            # Process the data and create trajectory
            return JsonResponse({
                "message": "Trajectory created successfully",
                "data": data
            }, status=201)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def trajectory_detail(request, pk):
    if request.method == "GET":
        # Handle GET request - return specific trajectory
        return JsonResponse({
            "message": f"Details for trajectory {pk}",
            "data": {}  # Add your trajectory data here
        })
    
    elif request.method == "PUT":
        # Handle PUT request - update trajectory
        try:
            data = json.loads(request.body)
            # Process the data and update trajectory
            return JsonResponse({
                "message": f"Trajectory {pk} updated successfully",
                "data": data
            })
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
    
    elif request.method == "DELETE":
        # Handle DELETE request - delete trajectory
        return JsonResponse({
            "message": f"Trajectory {pk} deleted successfully"
        }, status=204)
