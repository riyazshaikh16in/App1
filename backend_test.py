import requests
import sys
import json
from datetime import datetime

class DinCharyaAPITester:
    def __init__(self, base_url="https://dincharya-ai.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response preview: {str(response_data)[:200]}...")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout after {timeout} seconds")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_weather_endpoint(self):
        """Test weather API endpoint"""
        return self.run_test("Weather API", "GET", "weather", 200)

    def test_weather_with_coordinates(self):
        """Test weather API with custom coordinates"""
        return self.run_test("Weather API with coordinates", "GET", "weather?lat=28.6139&lon=77.2090", 200)

    def test_news_endpoint(self):
        """Test news API endpoint"""
        return self.run_test("News API", "GET", "news", 200)

    def test_chat_endpoint(self):
        """Test chat API endpoint with AI integration"""
        chat_data = {
            "message": "What should I eat for breakfast?",
            "user_id": "test_user_123",
            "location": {"lat": 28.6139, "lon": 77.2090}
        }
        return self.run_test("Chat API (AI Integration)", "POST", "chat", 200, chat_data, timeout=60)

    def test_routine_save(self):
        """Test routine saving endpoint"""
        routine_data = {
            "user_id": "test_user_123",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "sleep_hours": 8.5,
            "water_glasses": 8,
            "exercise_minutes": 30,
            "mood": "good"
        }
        return self.run_test("Save Routine", "POST", "routine", 200, routine_data)

    def test_routine_history(self):
        """Test routine history retrieval"""
        return self.run_test("Get Routine History", "GET", "routine/test_user_123", 200)

    def test_chat_history(self):
        """Test chat history retrieval"""
        return self.run_test("Get Chat History", "GET", "chat/history/test_user_123", 200)

def main():
    print("🚀 Starting Din Charya AI Backend API Tests")
    print("=" * 60)
    
    tester = DinCharyaAPITester()
    
    # Test all endpoints
    tests = [
        tester.test_root_endpoint,
        tester.test_weather_endpoint,
        tester.test_weather_with_coordinates,
        tester.test_news_endpoint,
        tester.test_routine_save,
        tester.test_routine_history,
        tester.test_chat_history,
        tester.test_chat_endpoint,  # Test AI integration last as it takes longest
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend API tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())