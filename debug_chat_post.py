import requests
import json

# Test the chat endpoint
url = "https://dincharya-ai.preview.emergentagent.com/api/chat"
data = {
    "message": "What should I eat for breakfast?",
    "user_id": "test_user_debug",
    "location": {"lat": 28.6139, "lon": 77.2090}
}

try:
    response = requests.post(url, json=data, timeout=60)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")