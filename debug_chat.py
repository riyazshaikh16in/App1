import requests
import json

# Test just the chat history endpoint to debug the issue
url = "https://dincharya-ai.preview.emergentagent.com/api/chat/history/test_user_123"

try:
    response = requests.get(url)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")