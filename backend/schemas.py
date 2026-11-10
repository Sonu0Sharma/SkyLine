from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Phase 0: New Nested Schemas ---

class ExperienceBase(BaseModel):
    title: str
    company: str
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None


class EducationBase(BaseModel):
    school: str
    degree: str
    year: str


class ProjectBase(BaseModel):
    name: str
    tech_stack: str
    description: str
    link: Optional[str] = None


class ResumeMetadata(BaseModel):
    id: int
    filename: str
    upload_date: datetime
    parsing_status: str
    primary_flag: bool
    note: Optional[str] = None
    content: Optional[str] = None  # <--- NEW FIELD


# --- Main Profile Schema ---

class UserProfileV2(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None  # Keep as string for simple tag input

    experience: List[ExperienceBase] = []
    education: List[EducationBase] = []
    projects: List[ProjectBase] = []


# --- Legacy Schema (Keep for compatibility) ---

class Job(BaseModel):
    id: str
    title: str
    company: Optional[str] = "Unknown"
    location: Optional[str] = "Remote"
    url: str
    source: str
    posted_date: datetime


class UserProfile(BaseModel):
    fullName: str  # Frontend uses camelCase currently
    email: str
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    skills: Optional[str] = None

    class Config:
        extra = "allow"
