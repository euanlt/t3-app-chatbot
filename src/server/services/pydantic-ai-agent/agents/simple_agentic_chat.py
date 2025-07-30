"""Simple Agentic Chat - working version for current pydantic-ai."""

import os
from datetime import datetime
from typing import Optional
import pytz
from pydantic_ai import Agent

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Set OpenRouter API key for Pydantic AI
os.environ['OPENROUTER_API_KEY'] = os.getenv('OPENROUTER_API_KEY', '')

# Create a simple agent
agent = Agent(
    model='openrouter:openai/gpt-4o-mini',
    system_prompt="""
    You are a helpful AI assistant with access to tools.
    You can check the current time in different timezones using get_time_in_timezone.
    You can also change the background color - just ask and the system will handle it.
    Be friendly and helpful in your responses.
    """
)

@agent.tool_plain
async def get_time_in_timezone(timezone: Optional[str] = None) -> str:
    """Get the current time, optionally in a specific timezone.
    
    Args:
        timezone: The timezone name (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo').
                 If not provided, returns UTC time.
    
    Returns:
        A string with the current time and timezone.
    """
    if not timezone:
        return f"Current time (UTC): {datetime.now(pytz.UTC).strftime('%Y-%m-%d %H:%M:%S %Z')}"
    
    try:
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
        return f"Current time in {timezone}: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}"
    except pytz.exceptions.UnknownTimeZoneError:
        available_timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney', 'America/Los_Angeles']
        return f"Unknown timezone '{timezone}'. Try one of these: {', '.join(available_timezones)}"

# Background color functionality is handled by CopilotKit frontend action

# Convert to AG-UI app
try:
    app = agent.to_ag_ui()
except Exception as e:
    print(f"Error creating AG-UI app: {e}")
    # Fallback: create a basic FastAPI app
    from fastapi import FastAPI
    app = FastAPI()
    
    @app.get("/")
    async def health():
        return {"status": "ok", "agent": "simple_agentic_chat"}