from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field

class PredictionRequest(BaseModel):
    age: int
    college_tier: Optional[int]=3
    cgpa: float
    attendance_percentage: float
    dsa_problems_solved: int
    aptitude_score: int
    projects_count: int
    internships_count: Optional[int]=0
    certifications_count: Optional[int]=0
    hackathons_participated: Optional[int]=0
    competitive_programming_rating: int
    study_hours_per_week: Optional[int]= 20 # avg (mean) study hour from the dataset
    soft_skills_score: int
    leadership_experience: Optional[int]= 0
    linkedIn_profile: int
    branch: str

class PredictionResponse(BaseModel):
    probability: float
    prediction: str