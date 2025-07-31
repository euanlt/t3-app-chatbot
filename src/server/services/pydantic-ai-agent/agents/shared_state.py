"""Shared State feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import os
from textwrap import dedent

from pydantic_ai import Agent

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Set OpenRouter API key for Pydantic AI
os.environ['OPENROUTER_API_KEY'] = os.getenv('OPENROUTER_API_KEY', '')


# Create the agent without any custom tools to avoid conflicts
agent = Agent(
    model='openrouter:openai/gpt-4o-mini',
    system_prompt=dedent("""
        You are a collaborative recipe builder that helps users create delicious recipes.
        
        When the user asks to create a recipe, respond with a detailed recipe that includes:
        - A creative and descriptive recipe title
        - A complete list of ingredients with specific measurements (e.g., "2 cups flour", "1 tsp salt")
        - Clear, step-by-step cooking instructions
        - Appropriate skill level (Beginner, Intermediate, or Advanced)
        - Realistic cooking time (5 min, 15 min, 30 min, 45 min, or 60+ min)
        - Any special dietary preferences if relevant
        
        Format your response as a normal conversational reply, but include all the recipe details clearly.
        The UI will automatically extract and display the recipe information.
        
        Be creative and helpful with recipe suggestions!
        Always provide complete, well-structured recipes that are easy to follow.
    """)
)


# Convert to AG-UI app
try:
    app = agent.to_ag_ui()
except Exception as e:
    print(f"Failed to create AG-UI app for shared_state: {e}")
    # Fallback: create basic FastAPI app
    from fastapi import FastAPI
    app = FastAPI()
    
    @app.get("/")
    async def health():
        return {"status": "ok", "agent": "shared_state"}