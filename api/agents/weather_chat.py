"""
Weather chat agent for Vercel serverless deployment.
"""

import os
import json
from datetime import datetime
from http.server import BaseHTTPRequestHandler
import asyncio

from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel


class WeatherResult(BaseModel):
    """Result from weather API call."""
    location: str
    temperature: float
    condition: str
    timestamp: datetime


# Mock weather data for demo
MOCK_WEATHER_DATA = {
    "london": WeatherResult(
        location="London, UK",
        temperature=15.2,
        condition="Partly cloudy",
        timestamp=datetime.now()
    ),
    "new york": WeatherResult(
        location="New York, NY",
        temperature=22.8,
        condition="Sunny",
        timestamp=datetime.now()
    ),
    "tokyo": WeatherResult(
        location="Tokyo, Japan", 
        temperature=18.5,
        condition="Overcast",
        timestamp=datetime.now()
    ),
    "sydney": WeatherResult(
        location="Sydney, Australia",
        temperature=25.1,
        condition="Clear skies",
        timestamp=datetime.now()
    )
}


def get_weather(location: str) -> WeatherResult:
    """
    Get current weather for a location.
    This is a mock implementation - in production you'd call a real weather API.
    """
    location_key = location.lower().strip()
    
    # Try to find matching location
    for key, data in MOCK_WEATHER_DATA.items():
        if key in location_key or location_key in key:
            return data
    
    # Default response for unknown locations
    return WeatherResult(
        location=location,
        temperature=20.0,
        condition="Data not available", 
        timestamp=datetime.now()
    )


# Create the agent
model = OpenAIModel(
    'gpt-4o-mini',
    api_key=os.getenv('OPENAI_API_KEY')
)

weather_agent = Agent(
    model,
    system_prompt=(
        'You are a helpful weather assistant. '
        'You can get current weather information for any location. '
        'Always be friendly and provide the weather info in a conversational way.'
    ),
    tools=[get_weather],
)


@weather_agent.tool
async def get_current_time() -> str:
    """Get the current time."""
    return f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}"


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length).decode('utf-8')
            
            # Parse request
            try:
                request_data = json.loads(body)
                messages = request_data.get('messages', [])
            except:
                self.send_error(400, 'Invalid JSON')
                return
            
            # Get the latest user message
            user_message = ""
            for msg in reversed(messages):
                if msg.get('role') == 'user':
                    user_message = msg.get('content', '')
                    break
            
            if not user_message:
                user_message = "Hello! How can I help you with weather information?"
            
            # Run the agent
            async def run_agent():
                result = await weather_agent.run(user_message)
                return result.data
            
            response_text = asyncio.run(run_agent())
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            response = {
                'type': 'agent_response',
                'data': {
                    'content': response_text,
                    'status': 'completed'
                }
            }
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()