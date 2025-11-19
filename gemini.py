from google import genai
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()

# Check key
print("API Key loaded:", os.getenv("GEMINI_API_KEY") is not None)

# Initialize client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Make a test request
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Say hello world in a creative way"
)

print(response.text)
