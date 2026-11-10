# Use official Python 3.11 image
FROM python:3.11-slim

# Set environment variables (Prevents Python from buffering stdout)
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies (needed for some python packages)
RUN apt-get update && apt-get install -y --no-install-recommends gcc && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download the SpaCy NLP model
RUN python -m spacy download en_core_web_sm

# Copy the backend code into the container
COPY backend /app/backend

# Expose the port
EXPOSE 8000

# Run the server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]