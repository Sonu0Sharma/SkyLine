import requests
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

def extract_job_text(url: str) -> str:
    """
    Attempts to scrape the main text content from a job posting URL.
    Returns the text or raises an exception if blocked/failed.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
            
        # Get text
        text = soup.get_text(separator='\n')
        
        # Clean up white space
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = '\n'.join(chunk for chunk in chunks if chunk)
        
        # Basic validation: If text is too short, scraping probably failed (captcha/login wall)
        if len(clean_text) < 100:
            raise Exception("Content too short. Site might require login.")
            
        return clean_text[:5000] # Limit to 5000 chars to save tokens
        
    except Exception as e:
        logger.error(f"Scraping failed for {url}: {e}")
        return "" # Return empty string to trigger manual input on frontend