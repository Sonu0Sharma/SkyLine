from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from uuid import uuid4
import logging
import re
import json

from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.mock_models import MockSession, MockInteraction
from backend.services import llm_router

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mock-v3", tags=["Mock V3"])

# --- Models ---
class StartReq(BaseModel):
    role: Optional[str] = "general"
    difficulty: Optional[str] = "Medium"
    question_count: Optional[int] = 5
    # Configs
    interview_type: Optional[str] = "Mixed"
    personality: Optional[str] = "Professional"

class SubmitReq(BaseModel):
    session_id: str
    answer: str
    exchange_id: Optional[str] = None

# --- Helpers ---
def _get_session(db, sid):
    return db.query(MockSession).filter(MockSession.session_id == sid).first()

def _create_interaction(db, session, q_text, a_text=None):
    inter = MockInteraction(session_id_fk=session.id, question=q_text, answer=a_text)
    db.add(inter)
    db.commit()
    db.refresh(inter)
    return inter

# --- Routes ---
@router.post("/start")
def start_session(payload: StartReq, db: Session = Depends(get_db)):
    sid = str(uuid4())
    session = MockSession(
        session_id=sid, 
        role=payload.role, 
        difficulty=payload.difficulty,
        total_questions=payload.question_count,
        interview_type=payload.interview_type,
        personality=payload.personality,
        current_q=0, 
        finished=False
    )
    db.add(session)
    db.commit()
    
    # 1. Ask First Question
    q = llm_router.ask_question(
        role=payload.role, 
        difficulty=payload.difficulty,
        type_=payload.interview_type,
        personality=payload.personality
    )
    _create_interaction(db, session, q["text"])
    session.current_q = 1
    db.commit()
    
    return {"status": "success", "data": {"session_id": sid, "question": q["text"], "role": payload.role}}

@router.post("/submit-answer")
def submit_answer(req: SubmitReq, db: Session = Depends(get_db)):
    session = _get_session(db, req.session_id)
    if not session: raise HTTPException(404, "Session not found")

    # 1. Save Answer
    last_inter = db.query(MockInteraction).filter(MockInteraction.session_id_fk == session.id).order_by(MockInteraction.created_at.desc()).first()
    if not last_inter: last_inter = _create_interaction(db, session, "Placeholder")
    
    inter = last_inter
    inter.answer = req.answer
    db.commit()

    # 2. Evaluate
    ev_res = llm_router.evaluate_answer(
        answer=req.answer, 
        question=inter.question, 
        role=session.role, 
        type_=session.interview_type,
        personality=session.personality
    )
    evaluation = ev_res.get("evaluation", {})
    provider = ev_res.get("provider", "none")
    
    # 3. Save Results
    try:
        # Format rich feedback
        raw_fb = evaluation.get("feedback", "")
        fb_text = " ".join([str(x) for x in raw_fb]) if isinstance(raw_fb, list) else str(raw_fb)
        score = evaluation.get("score", 0)
        
        rich_feedback = f"Score: {score}\n\nFeedback:\n{fb_text}\n\n"
        if evaluation.get("strengths"):
            rich_feedback += "Strengths:\n" + "\n".join([f"- {s}" for s in evaluation["strengths"]]) + "\n\n"
        if evaluation.get("weaknesses"):
            rich_feedback += "Weaknesses:\n" + "\n".join([f"- {w}" for w in evaluation["weaknesses"]])
            
        inter.feedback = rich_feedback.strip()
        
        raw_rw = evaluation.get("suggested_rewrite") or evaluation.get("improved_answer") or ""
        inter.improved_answer = " ".join([str(x) for x in raw_rw]) if isinstance(raw_rw, list) else str(raw_rw)
        
        db.commit()
    except Exception as e:
        logger.error(f"Feedback save error: {e}")
        db.rollback()

    # 4. Check Next
    next_question_data = None
    if session.current_q < session.total_questions:
        q = llm_router.ask_question(
            role=session.role, 
            difficulty=session.difficulty,
            type_=session.interview_type,
            personality=session.personality
        )
        if q["text"]: 
            _create_interaction(db, session, q["text"])
            session.current_q += 1
            db.commit()
            next_question_data = {"question": q["text"], "current_index": session.current_q}
    else:
        session.finished = True
        db.commit()

    return {
        "status": "success",
        "data": {
            "evaluation": evaluation,
            "next_question": next_question_data, 
            "is_finished": session.finished,
            "provider": provider
        }
    }

@router.post("/{session_id}/end")
def end_session(session_id: str, db: Session = Depends(get_db)):
    session = _get_session(db, session_id)
    if session:
        session.finished = True
        db.commit()
    return {"status": "success"}

@router.get("/{session_id}/results")
def get_results(session_id: str, db: Session = Depends(get_db)):
    session = _get_session(db, session_id)
    if not session: raise HTTPException(404, "Session not found")

    interactions = db.query(MockInteraction).filter(MockInteraction.session_id_fk == session.id).all()
    transcript = []
    scores = []
    full_text_transcript = ""

    for it in interactions:
        transcript.append({
            "question": it.question or "",
            "user_answer": it.answer or "",
            "feedback": it.feedback or "",
            "improved_answer": it.improved_answer or ""
        })
        full_text_transcript += f"Q: {it.question}\nA: {it.answer}\n\n"
        if it.feedback:
            m = re.search(r"Score[:\s]*([0-9]{1,3})", it.feedback)
            if m: scores.append(int(m.group(1)))

    overall = int(sum(scores) / len(scores)) if scores else 0

    if not session.report_json and full_text_transcript:
        report_data = llm_router.generate_final_report(session.role, full_text_transcript)
        session.report_json = json.dumps(report_data)
        db.commit()
    
    final_report = json.loads(session.report_json) if session.report_json else {}

    return {
        "status": "success",
        "data": {
            "overall_score": overall,
            "dimensions": final_report.get("dimensions", {}),
            "feedback": final_report.get("feedback", {}),
            "transcript": transcript
        }
    }

@router.get("/history/all")
def get_history(db: Session = Depends(get_db)):
    """
    Returns a summary of all finished sessions for analytics.
    """
    sessions = db.query(MockSession).filter(MockSession.finished == True).order_by(MockSession.created_at.desc()).all()
    
    history = []
    for s in sessions:
        # Calculate Score on the fly to be robust
        interactions = s.interactions
        scores = []
        for i in interactions:
            if i.feedback:
                m = re.search(r"Score[:\s]*([0-9]{1,3})", i.feedback)
                if m: scores.append(int(m.group(1)))
        
        avg_score = int(sum(scores) / len(scores)) if scores else 0
        
        # Get Dimensions
        dims = {}
        if s.report_json:
            try:
                data = json.loads(s.report_json)
                dims = data.get("dimensions", {})
            except: pass

        history.append({
            "session_id": s.session_id,
            "role": s.role,
            "difficulty": s.difficulty,
            "type": s.interview_type,
            "date": s.created_at,
            "score": avg_score,
            "dimensions": dims
        })
        
    return {"status": "success", "data": history}