"""
Weather chat agent for Vercel serverless deployment.
Based on the PydanticAI weather example.
"""

import os
from datetime import datetime
from typing import Dict, Any

from pydantic import BaseModel
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIModel

from _base import create_agent_handler


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


# Create the Vercel handler
handler = create_agent_handler(weather_agent)


def main(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Vercel serverless function entry point.
    """
    import asyncio
    return asyncio.run(handler(event, context))