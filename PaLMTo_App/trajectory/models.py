from django.db import models

# Table for uploaded file
class UploadedTrajectory(models.Model):
    """
        Database table to store user uploaded csv files. 
    """
    uploaded_at = models.DateTimeField(auto_now_add=True)
    # Store files at 'media/uploads/'
    original_file = models.FileField(upload_to='uploads/', blank=True, null=True)

    def __str__(self) -> str:
        return f"Uploaded trajectory {self.id} ({'default file' if not self.original_file else self.original_file.name})"
    

# Table for user-configed options
class GenerationConfig(models.Model):
    uploaded = models.ForeignKey(UploadedTrajectory, on_delete=models.CASCADE, related_name='generation_configs', null=True, blank=True)
    cell_size = models.IntegerField(help_text="Grid cell size in meters")
    num_trajectories = models.PositiveIntegerField(help_text="Number of trajectories to generate")
    trajector_length = models.PositiveIntegerField(
        blank=True, null=True,
        help_text="Length of each trajectory, if applicable."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    generation_method = models.CharField(max_length=50, choices=[
        ('length_constrained', 'Length-Constrained from Start Point'),
        ('point_to_point', 'Between Two Points')
    ])

    def __str__(self):
        return f"Config for Upload {self.uploaded.id} ({self.generation_method})"


# Table for generated trajectories
class GeneratedTrajectory(models.Model):
    # Create many-to-one relatioinship 
    uploaded = models.ForeignKey(UploadedTrajectory, on_delete=models.CASCADE, related_name='generated_files')
    config = models.ForeignKey(GenerationConfig, on_delete=models.CASCADE, related_name='generated_trajectories', null=True, blank=True)
    generated_file = models.FileField(upload_to='generated/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"GeneratedTrajectory {self.id} from Upload {self.uploaded.id}"