import requests
from typing import List
from datetime import datetime, timezone
from dateutil.parser import parse
from pydantic import ValidationError
from backend.schemas import Job
from backend.config import get_settings

settings = get_settings()

def standardize_date(dt_str: str) -> datetime:
    """Helper to ensure all dates are UTC aware"""
    if not dt_str:
        return datetime.now(timezone.utc)
    try:
        dt = parse(str(dt_str))
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    except:
        return datetime.now(timezone.utc)

def fetch_arbeitnow_jobs(query: str) -> List[Job]:
    jobs = []
    if not query: return [] # API requires query usually
    try:
        response = requests.get(f"https://www.arbeitnow.com/api/job-board-api?search={query}")
        if response.status_code == 200:
            data = response.json().get("data", [])
            for item in data:
                try:
                    job = Job(
                        id=str(item.get("slug")),
                        title=item.get("title"),
                        company=item.get("company_name"),
                        location=item.get("location"),
                        url=item.get("url"),
                        source="ArbeitNow",
                        posted_date=standardize_date(item.get("created_at"))
                    )
                    jobs.append(job)
                except ValidationError:
                    continue
    except Exception as e:
        print(f"Error fetching ArbeitNow: {e}")
    return jobs

def fetch_remotive_jobs(query: str) -> List[Job]:
    jobs = []
    url = f"https://remotive.com/api/remote-jobs?search={query}" if query else "https://remotive.com/api/remote-jobs"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json().get("jobs", [])
            for item in data:
                try:
                    job = Job(
                        id=str(item.get("id")),
                        title=item.get("title"),
                        company=item.get("company_name"),
                        location=item.get("candidate_required_location", "Remote"),
                        url=item.get("url"),
                        source="Remotive",
                        posted_date=standardize_date(item.get("publication_date"))
                    )
                    jobs.append(job)
                except ValidationError:
                    continue
    except Exception as e:
        print(f"Error fetching Remotive: {e}")
    return jobs

def fetch_adzuna_jobs(query: str, location: str, company: str, days_old: int) -> List[Job]:
    jobs = []
    # Use keys from settings
    params = {
        'app_id': settings.ADZUNA_APP_ID, 
        'app_key': settings.ADZUNA_APP_KEY, 
        'results_per_page': 50, 
        'what': query, 
        'where': location or 'us', 
        'company': company, 
        'max_days_old': days_old if days_old > 0 else None 
    }
    # Filter None values
    params = {k: v for k, v in params.items() if v is not None}
    
    try:
        response = requests.get("https://api.adzuna.com/v1/api/jobs/us/search/1", params=params)
        if response.status_code == 200:
            data = response.json().get("results", [])
            for item in data:
                try:
                    job = Job(
                        id=str(item.get("id")),
                        title=item.get("title"),
                        company=item.get("company", {}).get("display_name"),
                        location=item.get("location", {}).get("display_name"),
                        url=item.get("redirect_url"),
                        source="Adzuna",
                        posted_date=standardize_date(item.get("created"))
                    )
                    jobs.append(job)
                except ValidationError:
                    continue
    except Exception as e:
        print(f"Error fetching Adzuna: {e}")
    return jobs