import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Skyline API"
    VERSION: str = "1.0.0"
    ENV: str = "development"
    
    # Feature Flags
    PROFILE_V2_ENABLED: bool = True # Toggle this to enable new DB logic

    # Security: Allow "*" (all) to fix Codespaces/Cloud connection issues
    CORS_ORIGINS: list = ["*"]
    
    # AI Keys (Leave empty to use Mock Mode)
    # Supports both GROQ_API_KEY and GEMINI_API_KEY depending on engine usage
    GEMINI_API_KEY: str = "" 
    GROQ_API_KEY: str = ""

    # Job API Keys
    ADZUNA_APP_ID: str = "e0878b4a"
    ADZUNA_APP_KEY: str = "1cd0cedb7c75a925aa696a54611ad4a4"

    class Config:
        env_file = ".env"
        extra = "ignore" # Ignore extra env vars to prevent validation errors

@lru_cache()
def get_settings():
    return Settings()