"""
Basic agentic chat agent for Vercel serverless deployment.
Similar to the PydanticAI dojo example.
"""

import os
from datetime import datetime
from typing import Dict, Any

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

from _base import create_agent_handler


# Create the model
model = OpenAIModel(
    'gpt-4o-mini',
    api_key=os.getenv('OPENAI_API_KEY')
)

# Create the agent
chat_agent = Agent(
    model,
    system_prompt=(
        'You are a helpful AI assistant. '
        'You can help with various tasks including checking the time and '
        'having conversations. Be friendly and helpful!'
    ),
)


@chat_agent.tool
async def get_current_time() -> str:
    """Get the current time."""
    return f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}"


@chat_agent.tool
async def set_background_color(color: str) -> str:
    """
    Set the background color of the UI.
    This is a demo tool - in a real implementation it would communicate with the frontend.
    """
    valid_colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'white', 'black']
    
    if color.lower() not in valid_colors:
        return f"Sorry, '{color}' is not a valid color. Available colors: {', '.join(valid_colors)}"
    
    return f"Background color set to {color}! 🎨"


# Create the Vercel handler
handler = create_agent_handler(chat_agent)


def main(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Vercel serverless function entry point.
    """
    import asyncio
    return asyncio.run(handler(event, context))