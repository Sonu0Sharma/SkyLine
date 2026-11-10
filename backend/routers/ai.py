from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.llm_engine import LLMEngine

router = APIRouter(prefix="/ai", tags=["AI"])

class AIRequest(BaseModel):
    prompt: str
    context: str = "general" # resume, ats, general, mock_interview
    role: str = "General"    # e.g. "Frontend Developer"

@router.post("/generate")
async def generate_text(request: AIRequest):
    try:
        # Map context to internal task type
        task_map = {
            "resume_gen": "resume",
            "ats_check": "ats",
            "mock_interview": "mock_interview"
        }
        task_type = task_map.get(request.context, "chat")
        
        response = LLMEngine.generate_response(request.prompt, task_type, request.role)
        return {"status": "success", "data": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))