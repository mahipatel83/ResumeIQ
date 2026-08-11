from django.db import models

# Create your models here.
from django.db import models

class Job(models.Model):
    company_name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    is_remote = models.BooleanField(default=False)
    
    # Selection options
    EMPLOYMENT_CHOICES = [
        ('full_time', 'Full-time'),
        ('part_time', 'Part-time'),
        ('contract', 'Contract'),
    ]
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_CHOICES)
    experience_level = models.CharField(max_length=20)
    
    # Stores the combined minimum and maximum values (e.g., "2-5 Years")
    experience_range = models.CharField(max_length=50) 
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.job_title} at {self.company_name}"