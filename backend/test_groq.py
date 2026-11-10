import os
from openai import OpenAI
from dotenv import load_dotenv

# 1. Load .env file explicitly
# This looks for .env in the current folder
load_dotenv()

# 2. Get Key
api_key = os.environ.get("GROQ_API_KEY")

print("------------------------------------------------")
print(f"DEBUG: Checking for Key...")
if api_key:
    print(f"DEBUG: Key found! Starts with: {api_key[:8]}...")
else:
    print("DEBUG: ❌ No API Key found in environment variables.")
    print("Tip: Make sure your .env file is in this folder and contains GROQ_API_KEY=...")
    exit(1)

# 3. Initialize Client
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=api_key
)

# 4. Test Call
print("DEBUG: Attempting to call Groq API...")
try:
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": "Return exactly this word: SUCCESS",
            }
        ],
        model="llama-3.1-8b-instant",
    )
    print("\n✅ SUCCESS! Connection established.")
    print(f"Response: {chat_completion.choices[0].message.content}")
except Exception as e:
    print("\n❌ FAILURE: Could not connect.")
    print(f"Error details: {e}")
print("------------------------------------------------")