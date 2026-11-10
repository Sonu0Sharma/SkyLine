from fastapi import APIRouter, Query
from typing import List, Optional
from backend.schemas import Job
from backend.services.job_fetcher import (
    fetch_adzuna_jobs, 
    fetch_arbeitnow_jobs, 
    fetch_remotive_jobs
)

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# CHANGED: "/" -> "" (This fixes the 307 Redirect error)
@router.get("", response_model=List[Job]) 
def get_all_jobs(
    query: Optional[str] = None, 
    location: Optional[str] = None, 
    company: Optional[str] = None, 
    days_old: Optional[int] = 0
):
    all_jobs = []
    
    # 1. Adzuna (Primary)
    adzuna_jobs = fetch_adzuna_jobs(query, location, company, days_old)
    all_jobs.extend(adzuna_jobs)
    
    # 2. Others (Only if no specific location filter)
    if not location and not company:
        arbeitnow_jobs = fetch_arbeitnow_jobs(query)
        all_jobs.extend(arbeitnow_jobs)
        
        remotive_jobs = fetch_remotive_jobs(query)
        all_jobs.extend(remotive_jobs)

    # 3. Sort by date (Newest first)
    all_jobs.sort(key=lambda job: job.posted_date, reverse=True)
    
    return all_jobs