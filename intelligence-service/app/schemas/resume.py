from pydantic import BaseModel, EmailStr
from typing import List, Optional


class PersonalInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None


class Education(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    cgpa: Optional[str] = None


class Experience(BaseModel):
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: List[str] = []


class Project(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    technologies: List[str] = []


class Skills(BaseModel):
    programming_languages: List[str] = []
    frameworks: List[str] = []
    databases: List[str] = []
    tools: List[str] = []
    cloud: List[str] = []
    other: List[str] = []


class ResumeResponse(BaseModel):
    personal_info: PersonalInfo
    summary: Optional[str] = None
    education: List[Education] = []
    experience: List[Experience] = []
    projects: List[Project] = []
    skills: Skills
    certifications: List[str] = []
    internships: List[str] = []
    achievements: List[str] = []
    publications: List[str] = []
    languages: List[str] = []
    interests: List[str] = []