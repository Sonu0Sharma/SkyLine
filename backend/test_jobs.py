import sys
import os

# Add the project root to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.job_fetcher import fetch_adzuna_jobs, fetch_remotive_jobs
from backend.config import get_settings

settings = get_settings()

print("--- Testing Job Fetcher ---")
print(f"Adzuna App ID: {settings.ADZUNA_APP_ID}")

print("\n1. Testing Adzuna...")
try:
    # Try a broad search
    jobs = fetch_adzuna_jobs(query="developer", location="us", company="", days_old=0)
    print(f"✅ Success! Found {len(jobs)} jobs.")
    if len(jobs) > 0:
        print(f"Sample: {jobs[0].title} at {jobs[0].company}")
except Exception as e:
    print(f"❌ Adzuna Failed: {e}")

print("\n2. Testing Remotive...")
try:
    jobs = fetch_remotive_jobs(query="python")
    print(f"✅ Success! Found {len(jobs)} jobs.")
except Exception as e:
    print(f"❌ Remotive Failed: {e}")