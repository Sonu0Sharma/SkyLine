from sqlalchemy import Boolean, Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    phone = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    location = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)  # Stored as JSON string or comma-separated
    
    # Relationships
    experience = relationship("Experience", back_populates="owner", cascade="all, delete-orphan")
    education = relationship("Education", back_populates="owner", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="owner", cascade="all, delete-orphan")


class Experience(Base):
    __tablename__ = "experience"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    company = Column(String)
    start_date = Column(String)
    end_date = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    owner = relationship("User", back_populates="experience")


class Education(Base):
    __tablename__ = "education"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    school = Column(String)
    degree = Column(String)
    year = Column(String)

    owner = relationship("User", back_populates="education")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    tech_stack = Column(String)
    description = Column(Text)
    link = Column(String, nullable=True)

    owner = relationship("User", back_populates="projects")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    filepath = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    parsing_status = Column(String, default="pending")  # pending, parsed, failed
    primary_flag = Column(Boolean, default=False)
    note = Column(String(140), nullable=True)
    content = Column(Text, nullable=True)  # <--- NEW FIELD ADDED

    owner = relationship("User", back_populates="resumes")
