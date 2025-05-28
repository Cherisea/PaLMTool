from django.db import models

# Table for frontend user form submision
class GenerationConfig(models.Model):
    created_at = models.DateTimeField(auto_now_add=True) 
    file = models.FileField(upload_to='uploads/', blank=True, null=True)   

    cell_size = models.IntegerField(help_text="Grid cell size in meters")
    num_trajectories = models.PositiveIntegerField(help_text="Number of trajectories to generate")
    trajectory_length = models.PositiveIntegerField(
        blank=True, null=True,
        help_text="Length of each trajectory, if applicable."
    )
    generation_method = models.CharField(max_length=50, choices=[
        ('length_constrained', 'Length-Constrained from Start Point'),
        ('point_to_point', 'Between Two Points')
    ])

    def __str__(self):
        return f"Configuration set for trajectory generation {self.id}"


# Table for generated trajectories
class GeneratedTrajectory(models.Model):
    # Create many-to-one relatioinship 
    config = models.ForeignKey(GenerationConfig, on_delete=models.CASCADE, related_name='generated_trajectories', null=True, blank=True)
    generated_file = models.FileField(upload_to='generated/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"GeneratedTrajectory {self.id} from Upload {self.config.id}"