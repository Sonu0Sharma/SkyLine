# backend/routers/profile.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import pathlib
import traceback

# Text extraction libs
import PyPDF2
import docx

from backend.database import get_db
from backend import models

# Optional imports (non-fatal)
try:
    from backend import schemas
    SCHEMAS_AVAILABLE = True
except Exception:
    SCHEMAS_AVAILABLE = False

try:
    from backend.services.text_cleaner import clean_text
except Exception:
    def clean_text(x: str, redact: bool = False) -> str:
        return x or ""

# Optional OCR libs
try:
    from pdf2image import convert_from_bytes
    import pytesseract
    OCR_AVAILABLE = True
except Exception:
    OCR_AVAILABLE = False

router = APIRouter(prefix="/profile", tags=["Profile V2"])


def _ensure_uploads_dir() -> pathlib.Path:
    uploads_dir = pathlib.Path(__file__).resolve().parents[1] / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    return uploads_dir


def get_current_user(db: Session) -> models.User:
    """
    Phase-0 auth shim: single demo user.
    If the demo user doesn't exist, create it.
    """
    try:
        user = db.query(models.User).filter(models.User.email == "user@example.com").first()
    except Exception:
        # Defensive: if models.User isn't accessible or DB schema surprises, raise
        raise HTTPException(status_code=500, detail="Database / User model issue")

    if not user:
        user = models.User(email="user@example.com", full_name="Demo User", phone=None, linkedin=None, location=None, bio=None, skills=None)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# -------------------------
# Profile (read / update)
# -------------------------
@router.get("/")
def get_profile(db: Session = Depends(get_db)):
    """
    Return the user's profile. If Pydantic schemas are available, return that model.
    Otherwise return a plain dict.
    """
    user = get_current_user(db)

    # Ensure relationships are loaded to avoid lazy errors in templates/serializers
    _ = getattr(user, "experience", None)
    _ = getattr(user, "education", None)
    _ = getattr(user, "projects", None)
    _ = getattr(user, "resumes", None)

    if SCHEMAS_AVAILABLE:
        try:
            return schemas.UserProfileV2(
                full_name=user.full_name or "",
                email=user.email or "",
                phone=user.phone or "",
                linkedin=user.linkedin or "",
                location=user.location or "",
                bio=user.bio or "",
                skills=user.skills or "",
                experience=[schemas.ExperienceBase(title=e.title, company=e.company, start_date=e.start_date, end_date=e.end_date, description=e.description) for e in user.experience],
                education=[schemas.EducationBase(school=e.school, degree=e.degree, year=e.year) for e in user.education],
                projects=[schemas.ProjectBase(name=p.name, tech_stack=p.tech_stack, description=p.description, link=p.link) for p in user.projects]
            )
        except Exception:
            # Fall back to plain dict if schema shape mismatch
            traceback.print_exc()

    # Fallback plain dict
    return {
        "full_name": user.full_name or "",
        "email": user.email or "",
        "phone": user.phone or "",
        "linkedin": user.linkedin or "",
        "location": user.location or "",
        "bio": user.bio or "",
        "skills": user.skills or "",
        "experience": [
            {"title": e.title, "company": e.company, "start_date": e.start_date, "end_date": e.end_date, "description": e.description}
            for e in user.experience
        ],
        "education": [
            {"school": ed.school, "degree": ed.degree, "year": ed.year}
            for ed in user.education
        ],
        "projects": [
            {"name": p.name, "tech_stack": p.tech_stack, "description": p.description, "link": p.link}
            for p in user.projects
        ]
    }


@router.post("/")
def update_profile(profile: dict, db: Session = Depends(get_db)):
    """
    Update user profile.
    Accepts either a Pydantic schema (if frontend uses that) or plain dict.
    Uses simple delete-and-recreate strategy for related lists (phase 0).
    """
    user = get_current_user(db)

    # Defensive mapping - support either pydantic or raw dict
    try:
        full_name = getattr(profile, "full_name", None) or profile.get("full_name")
        phone = getattr(profile, "phone", None) or profile.get("phone")
        linkedin = getattr(profile, "linkedin", None) or profile.get("linkedin")
        location = getattr(profile, "location", None) or profile.get("location")
        bio = getattr(profile, "bio", None) or profile.get("bio")
        skills = getattr(profile, "skills", None) or profile.get("skills")
    except Exception:
        # If structure is completely unexpected, return 400
        raise HTTPException(status_code=400, detail="Invalid profile payload")

    user.full_name = full_name
    user.phone = phone
    user.linkedin = linkedin
    user.location = location
    user.bio = bio
    user.skills = skills

    # Replace related collections (Experience / Education / Projects)
    try:
        # Experiences
        db.query(models.Experience).filter(models.Experience.user_id == user.id).delete()
        experiences = (getattr(profile, "experience", None) or profile.get("experience", []))
        for exp in experiences:
            # exp may be pydantic or dict - accept both
            if hasattr(exp, "model_dump"):
                exp_data = exp.model_dump()
            else:
                exp_data = dict(exp)
            db.add(models.Experience(user_id=user.id,
                                     title=exp_data.get("title"),
                                     company=exp_data.get("company"),
                                     start_date=exp_data.get("start_date"),
                                     end_date=exp_data.get("end_date"),
                                     description=exp_data.get("description")))
        # Education
        db.query(models.Education).filter(models.Education.user_id == user.id).delete()
        educations = (getattr(profile, "education", None) or profile.get("education", []))
        for ed in educations:
            if hasattr(ed, "model_dump"):
                ed_data = ed.model_dump()
            else:
                ed_data = dict(ed)
            db.add(models.Education(user_id=user.id,
                                    school=ed_data.get("school"),
                                    degree=ed_data.get("degree"),
                                    year=ed_data.get("year")))
        # Projects
        db.query(models.Project).filter(models.Project.user_id == user.id).delete()
        projects = (getattr(profile, "projects", None) or profile.get("projects", []))
        for pr in projects:
            if hasattr(pr, "model_dump"):
                pr_data = pr.model_dump()
            else:
                pr_data = dict(pr)
            db.add(models.Project(user_id=user.id,
                                  name=pr_data.get("name"),
                                  tech_stack=pr_data.get("tech_stack"),
                                  description=pr_data.get("description"),
                                  link=pr_data.get("link")))
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to update related records")

    db.commit()
    db.refresh(user)
    return get_profile(db)


# -------------------------
# Resume Management
# -------------------------

# Define get_resumes differently depending on whether schemas are available.
# This guarantees the OpenAPI spec shows a list response when schemas are installed,
# and ensures the runtime always returns a Python list (never a single object).
if SCHEMAS_AVAILABLE:
    @router.get("/resumes", response_model=List[schemas.ResumeMetadata])
    def get_resumes(db: Session = Depends(get_db)):
        """
        Return list of resumes for the demo user.
        Always returns a list (possibly empty). When schemas are available,
        FastAPI will validate the list elements against ResumeMetadata.
        """
        user = get_current_user(db)
        resumes = db.query(models.Resume).filter(models.Resume.user_id == user.id).order_by(models.Resume.upload_date.desc()).all()

        # Defensive: ensure resumes is a list
        if resumes is None:
            return []

        out = []
        try:
            for r in resumes:
                out.append(schemas.ResumeMetadata(
                    id=r.id,
                    filename=r.filename,
                    upload_date=r.upload_date,
                    parsing_status=r.parsing_status,
                    primary_flag=r.primary_flag
                ))
            # Guarantee list return
            return out
        except Exception:
            # If schema conversion fails, fall back to dict list
            traceback.print_exc()
            fallback = []
            for r in resumes:
                fallback.append({
                    "id": r.id,
                    "filename": r.filename,
                    "filepath": r.filepath,
                    "upload_date": r.upload_date,
                    "parsing_status": r.parsing_status,
                    "primary_flag": r.primary_flag,
                    "note": r.note
                })
            return fallback
else:
    @router.get("/resumes")
    def get_resumes(db: Session = Depends(get_db)):
        """
        Return list of resumes (plain dicts). Always returns a list (possibly empty).
        """
        user = get_current_user(db)
        resumes = db.query(models.Resume).filter(models.Resume.user_id == user.id).order_by(models.Resume.upload_date.desc()).all()

        if not resumes:
            return []

        return [
            {
                "id": r.id,
                "filename": r.filename,
                "filepath": r.filepath,
                "upload_date": r.upload_date,
                "parsing_status": r.parsing_status,
                "primary_flag": r.primary_flag,
                "note": r.note
            }
            for r in resumes
        ]


@router.post("/resumes")
async def add_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload resume file, attempt to parse text, optionally fallback to OCR if available.
    Saves the parsed + cleaned content into Resume.content.
    """
    user = get_current_user(db)
    uploads_dir = _ensure_uploads_dir()

    parsing_status = "pending"
    content = ""
    saved_path_str = ""

    try:
        raw = await file.read()
        filename = file.filename or "uploaded_resume"
        safe_filename = filename.replace(" ", "_")
        saved_path = uploads_dir / safe_filename
        with open(saved_path, "wb") as f:
            f.write(raw)
        saved_path_str = str(saved_path)

        fname_lower = filename.lower()
        # PDF
        if fname_lower.endswith(".pdf"):
            try:
                reader = PyPDF2.PdfReader(io.BytesIO(raw))
                pages = []
                for p in reader.pages:
                    try:
                        pages.append(p.extract_text() or "")
                    except Exception:
                        continue
                content = "\n\n".join(pages).strip()
            except Exception:
                content = ""

            if (not content or len(content.strip()) < 200) and OCR_AVAILABLE:
                try:
                    images = convert_from_bytes(raw, dpi=200, fmt="jpeg")
                    ocr_texts = []
                    for img in images:
                        try:
                            ocr_texts.append(pytesseract.image_to_string(img, lang="eng"))
                        except Exception:
                            ocr_texts.append("")
                    ocr_joined = "\n\n".join(ocr_texts).strip()
                    if ocr_joined and len(ocr_joined) > len(content or ""):
                        content = ocr_joined
                        parsing_status = "parsed_via_ocr"
                except Exception:
                    parsing_status = parsing_status or "failed"
            else:
                if content and len(content.strip()) >= 200:
                    parsing_status = "parsed"
        # DOCX
        elif fname_lower.endswith(".docx"):
            try:
                doc = docx.Document(io.BytesIO(raw))
                paras = [p.text for p in doc.paragraphs]
                content = "\n".join(paras).strip()
                if content and len(content) >= 50:
                    parsing_status = "parsed"
            except Exception:
                content = ""
                parsing_status = "failed"
        else:
            # unsupported
            content = ""
            parsing_status = "failed"

    except Exception:
        traceback.print_exc()
        content = ""
        parsing_status = "failed"

    # Clean content
    try:
        cleaned = clean_text(content or "", redact=False)
    except Exception:
        cleaned = content or ""

    if not cleaned or len(cleaned.strip()) < 20:
        parsing_status = "failed"
    elif parsing_status == "pending":
        parsing_status = "parsed"

    # Save resume record
    resume = models.Resume(
        user_id=user.id,
        filename=filename,
        filepath=saved_path_str or f"/uploads/{filename}",
        parsing_status=parsing_status,
        primary_flag=False,
        note=None,
        content=cleaned
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # If first resume, set primary
    try:
        total = db.query(models.Resume).filter(models.Resume.user_id == user.id).count()
        if total == 1:
            resume.primary_flag = True
            db.commit()
    except Exception:
        pass

    if SCHEMAS_AVAILABLE:
        try:
            return schemas.ResumeMetadata(
                id=resume.id,
                filename=resume.filename,
                upload_date=resume.upload_date,
                parsing_status=resume.parsing_status,
                primary_flag=resume.primary_flag
            )
        except Exception:
            traceback.print_exc()

    return {
        "id": resume.id,
        "filename": resume.filename,
        "filepath": resume.filepath,
        "upload_date": resume.upload_date,
        "parsing_status": resume.parsing_status,
        "primary_flag": resume.primary_flag,
        "note": resume.note
    }


@router.put("/resumes/{resume_id}/primary")
def set_primary_resume(resume_id: int, db: Session = Depends(get_db)):
    user = get_current_user(db)
    # Unset all first
    db.query(models.Resume).filter(models.Resume.user_id == user.id).update({"primary_flag": False})
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id, models.Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume.primary_flag = True
    db.commit()
    return {"status": "success"}


@router.put("/resumes/{resume_id}/note")
def update_resume_note(resume_id: int, note: str = "", db: Session = Depends(get_db)):
    user = get_current_user(db)
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id, models.Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume.note = (note or "")[:140]
    db.commit()
    return {"status": "success"}


@router.delete("/resumes/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    user = get_current_user(db)
    rec = db.query(models.Resume).filter(models.Resume.id == resume_id, models.Resume.user_id == user.id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Resume not found")
    db.delete(rec)
    db.commit()
    return {"status": "success"}
