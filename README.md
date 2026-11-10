# 🏙️ Project Skyline - AI Career Assistant

Skyline is a comprehensive AI-powered platform for job seekers. It integrates job search, resume generation, ATS scoring, and mock interviews into a single unified interface.

## 🚀 Key Features
- **Intelligent Job Aggregator:** Real-time search from Adzuna, Remotive, and ArbeitNow.
- **AI Resume Generator:** Scrapes Job Descriptions (JD) and tailors resumes using Gemini AI.
- **ATS Score Checker:** Uses NLP (SpaCy) + Fuzzy Logic to score resumes against JDs.
- **Mock Interview Simulator:** Interactive role-play with an AI interviewer.

## 🛠️ Tech Stack
- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** FastAPI, Python 3.11
- **AI/NLP:** Google Gemini Pro, SpaCy, RapidFuzz
- **Deployment:** Docker

## ⚡ Quick Start

### Option A: Local Setup (No Docker)

**1. Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn backend.main:app --reload