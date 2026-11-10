from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_settings
from backend.database import engine, Base

# Routers
from backend.routers import ai, jobs, resume, profile
from backend.routers.mock_v3 import router as mock_v3_router
from backend.routers import ai_enhance  # <-- NEW: AI enhancement (with alias)

# Environment
from dotenv import load_dotenv
load_dotenv()

# Auto-create sqlite tables
Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION
)

# -------------------------------------------------
# CORS (required for frontend)
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# ROUTERS (order does not matter, but grouping helps)
# -------------------------------------------------

# Core features
app.include_router(ai.router)
app.include_router(jobs.router)
app.include_router(resume.router)
app.include_router(profile.router)
app.include_router(mock_v3_router)

# AI ATS Enhancement
app.include_router(ai_enhance.router)        # Correct route → /api/ai/enhance-ats
app.include_router(ai_enhance.alias_router)  # Legacy alias → /ai/enhance-ats

# -------------------------------------------------
# HEALTH CHECK
# -------------------------------------------------
@app.get("/")
def read_root():
    return {"message": "Skyline AI Backend is Running!"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "env": settings.ENV}

# -------------------------------------------------
# Local Development Entry
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
