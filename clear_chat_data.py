import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

async def clear_chat_data():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Clear all chat data to remove problematic ObjectId records
    result = await db.chats.delete_many({})
    print(f"Deleted {result.deleted_count} chat records")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_chat_data())