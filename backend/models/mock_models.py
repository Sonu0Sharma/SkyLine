import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class MockSession(Base):
    __tablename__ = "mock_sessions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    role = Column(String(128), nullable=True)
    
    # Session Config
    difficulty = Column(String(50), default="Medium")
    total_questions = Column(Integer, default=5)
    
    # --- NEW FIELDS ---
    interview_type = Column(String(50), default="Mixed") # Technical, Behavioral, etc.
    personality = Column(String(50), default="Professional") # Friendly, Strict
    # ------------------

    current_q = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    finished = Column(Boolean, default=False)
    
    report_json = Column(Text, nullable=True)

    interactions = relationship("MockInteraction", back_populates="session", cascade="all, delete-orphan")

class MockInteraction(Base):
    __tablename__ = "mock_interactions"
    id = Column(Integer, primary_key=True, index=True)
    session_id_fk = Column(Integer, ForeignKey("mock_sessions.id"), nullable=False)
    
    question = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    improved_answer = Column(Text, nullable=True) 
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("MockSession", back_populates="interactions")