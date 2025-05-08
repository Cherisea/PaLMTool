from django.db import models

# Create your models here.
class UploadedTrajectory(models.Model):
    """
        Database table to store user uploaded csv files. 
    """
    uploaded_at = models.DateTimeField(auto_now_add=True)
    # Store files at 'media/uploads/'
    original_file = models.FileField(upload_to='uploads/', blank=True, null=True)

    def __str__(self) -> str:
        return f"Uploaded trajectory {self.id} ({'default file' if not self.original_file else self.original_file.name})"
    
class GeneratedTrajectory(models.Model):
    # Create many-to-one relatioinship 
    uploaded = models.ForeignKey(UploadedTrajectory, on_delete=models.CASCADE, related_name='generated_files')
    generated_file = models.FileField(upload_to='generated/')
    created_at = models.DateTimeField(auto_now_add=True)
    generation_method = models.CharField(max_length=50, choices=[
        ('length_constrained', 'Length Constrained'),
        ('point_to_point', 'Between Given Points')
    ])

    def __str__(self) -> str:
        return f"GeneratedTrajectory {self.id} from Upload {self.uploaded.id}"