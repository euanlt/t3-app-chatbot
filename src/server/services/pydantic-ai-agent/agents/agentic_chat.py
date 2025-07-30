"""Agentic Chat feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import os
from datetime import datetime
from textwrap import dedent
from typing import Optional

import pytz
from pydantic import BaseModel

from pydantic_ai import Agent

# Create the agent
agent = Agent(
    model=os.getenv('OPENAI_MODEL', 'openai:gpt-4o-mini'),
    system_prompt=dedent("""
        You are a helpful AI assistant with access to tools.
        You can check the current time in different timezones and change the background color.
        Be friendly and helpful in your responses.
    """)
)


# Tool definitions
@agent.tool_plain
async def get_current_time(timezone: Optional[str] = None) -> str:
    """Get the current time in a specific timezone.
    
    Args:
        timezone: IANA timezone string (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo').
                 If not provided, returns UTC time.
    
    Returns:
        Current time as a formatted string.
    """
    try:
        if not timezone:
            now = datetime.now(pytz.UTC)
            return f"Current time (UTC): {now.strftime('%Y-%m-%d %H:%M:%S %Z')}"
        
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
        return f"Current time in {timezone}: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}"
    except pytz.UnknownTimeZoneError:
        return (
            f"Unknown timezone '{timezone}'. "
            f"Please use a valid IANA timezone like 'America/New_York', 'Europe/London', or 'Asia/Tokyo'."
        )
    except Exception as e:
        return f"Error getting time: {str(e)}"


@agent.tool_plain
async def set_background_color(color: str) -> str:
    """Set the background color of the application.
    
    Args:
        color: Color name (red, blue, green, yellow, purple, orange, pink, white, black, gray)
               or hex code (e.g., #FF5733).
    
    Returns:
        Confirmation message.
    """
    valid_colors = [
        'red', 'blue', 'green', 'yellow', 'purple', 
        'orange', 'pink', 'white', 'black', 'gray'
    ]
    
    # Check if it's a valid color name
    if color.lower() in valid_colors:
        # This will be handled by the frontend via CopilotKit action
        return f"Background color changed to {color}! 🎨"
    
    # Check if it's a hex color
    if color.startswith('#') and len(color) in [4, 7]:
        return f"Background color changed to {color}! 🎨"
    
    return (
        f"Invalid color '{color}'. "
        f"Please use a color name ({', '.join(valid_colors)}) or a hex code (e.g., #FF5733)."
    )


# Convert to AG-UI app
app = agent.to_ag_ui()