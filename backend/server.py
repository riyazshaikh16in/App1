from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
OPENWEATHER_KEY = os.environ.get('OPENWEATHER_KEY')

# Create the main app without a prefix
app = FastAPI(title="Din Charya AI", description="AI-powered daily assistant")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str
    response: str
    context: Optional[dict] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    message: str
    user_id: str = "default_user"
    location: Optional[dict] = None

class WeatherData(BaseModel):
    temperature: float
    condition: str
    location: str
    humidity: Optional[int] = None
    feels_like: Optional[float] = None

class RoutineEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    date: str
    sleep_hours: Optional[float] = None
    water_glasses: Optional[int] = None
    exercise_minutes: Optional[int] = None
    mood: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoutineRequest(BaseModel):
    user_id: str = "default_user"
    date: str
    sleep_hours: Optional[float] = None
    water_glasses: Optional[int] = None
    exercise_minutes: Optional[int] = None
    mood: Optional[str] = None

# Initialize Claude AI
def get_ai_chat(user_id: str):
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"dincharya_{user_id}",
        system_message="""You are Din Charya AI, a helpful daily life assistant. You help users make smart daily decisions about:
        - What to eat (considering time, weather, preferences, health)
        - What to wear (based on weather, occasion, season)
        - Daily activities and productivity tips
        - Routine tracking and habit building
        - Weekend planning and entertainment

        Always provide practical, personalized suggestions with brief explanations. Be friendly, encouraging, and consider the user's context like weather and time of day. Keep responses concise but helpful."""
    ).with_model("anthropic", "claude-3-7-sonnet-20250219")

# Helper Functions
def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

async def get_weather_data(lat: float = 28.6139, lon: float = 77.2090):
    """Get weather data from OpenWeatherMap API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": OPENWEATHER_KEY,
                    "units": "metric"
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            return WeatherData(
                temperature=data["main"]["temp"],
                condition=data["weather"][0]["description"],
                location=data["name"],
                humidity=data["main"]["humidity"],
                feels_like=data["main"]["feels_like"]
            )
    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return WeatherData(
            temperature=25.0,
            condition="partly cloudy",
            location="Delhi",
            humidity=60,
            feels_like=26.0
        )

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Din Charya AI is running!", "status": "healthy"}

@api_router.post("/chat", response_model=ChatMessage)
async def chat_with_ai(request: ChatRequest):
    try:
        # Get current weather for context
        weather = None
        if request.location:
            weather = await get_weather_data(
                request.location.get('lat', 28.6139),
                request.location.get('lon', 77.2090)
            )
        else:
            weather = await get_weather_data()

        # Get user's recent routine data for context
        recent_routine = await db.routines.find_one(
            {"user_id": request.user_id},
            sort=[("timestamp", -1)]
        )

        # Build context for AI
        context = {
            "weather": weather.dict() if weather else None,
            "recent_routine": recent_routine,
            "time": datetime.now(timezone.utc).strftime("%H:%M"),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        }

        # Create AI message with context
        ai_message = f"""Current context:
Weather: {weather.temperature}°C, {weather.condition} in {weather.location}
Time: {context['time']}
Date: {context['date']}

User question: {request.message}

Please provide a helpful recommendation considering the weather and time."""

        # Get AI response
        ai_chat = get_ai_chat(request.user_id)
        user_message = UserMessage(text=ai_message)
        ai_response = await ai_chat.send_message(user_message)
        
        # Create chat record
        chat_record = ChatMessage(
            message=request.message,
            response=ai_response,
            context=context
        )
        
        # Store in database
        chat_dict = prepare_for_mongo(chat_record.dict())
        result = await db.chats.insert_one(chat_dict)
        
        return chat_record
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@api_router.get("/weather")
async def get_weather(lat: float = 28.6139, lon: float = 77.2090):
    """Get current weather data"""
    weather = await get_weather_data(lat, lon)
    return weather

@api_router.post("/routine", response_model=RoutineEntry)
async def save_routine(request: RoutineRequest):
    """Save daily routine data"""
    routine = RoutineEntry(**request.dict())
    routine_dict = prepare_for_mongo(routine.dict())
    result = await db.routines.insert_one(routine_dict)
    return routine

@api_router.get("/routine/{user_id}")
async def get_routine_history(user_id: str, limit: int = 7):
    """Get routine history for a user"""
    routines_cursor = db.routines.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit)
    routines = await routines_cursor.to_list(limit)
    
    # Parse datetime strings back to datetime objects for Pydantic
    parsed_routines = []
    for routine in routines:
        if isinstance(routine.get('timestamp'), str):
            try:
                routine['timestamp'] = datetime.fromisoformat(routine['timestamp'].replace('Z', '+00:00'))
            except:
                routine['timestamp'] = datetime.now(timezone.utc)
        parsed_routines.append(RoutineEntry(**routine))
    
    return parsed_routines

@api_router.get("/chat/history/{user_id}")
async def get_chat_history(user_id: str, limit: int = 10):
    """Get chat history for a user"""
    try:
        chats_cursor = db.chats.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit)
        chats_raw = await chats_cursor.to_list(limit)
        
        parsed_chats = []
        for chat_raw in chats_raw:
            try:
                # Handle timestamp parsing
                if isinstance(chat_raw.get('timestamp'), str):
                    chat_raw['timestamp'] = datetime.fromisoformat(chat_raw['timestamp'].replace('Z', '+00:00'))
                elif not isinstance(chat_raw.get('timestamp'), datetime):
                    chat_raw['timestamp'] = datetime.now(timezone.utc)
                
                # Create ChatMessage, handling missing fields
                chat_data = {
                    'id': chat_raw.get('id', str(uuid.uuid4())),
                    'message': chat_raw.get('message', ''),
                    'response': chat_raw.get('response', ''),
                    'context': chat_raw.get('context'),
                    'timestamp': chat_raw['timestamp']
                }
                
                chat_obj = ChatMessage(**chat_data)
                parsed_chats.append(chat_obj)
            except Exception as e:
                logger.error(f"Error parsing individual chat: {e}")
                continue
        
        return parsed_chats
    except Exception as e:
        logger.error(f"Chat history error: {e}")
        return []

@api_router.get("/news")
async def get_news():
    """Get trending news (mock data for MVP)"""
    return {
        "news": [
            {"title": "Tech Innovation Trends 2025", "source": "TechNews", "time": "2 hours ago"},
            {"title": "Health & Wellness Tips", "source": "HealthToday", "time": "4 hours ago"}, 
            {"title": "Latest Economic Updates", "source": "BusinessDaily", "time": "6 hours ago"}
        ]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()