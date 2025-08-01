"""Predictive State Updates feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import os
from textwrap import dedent

from pydantic_ai import Agent

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Set OpenRouter API key for Pydantic AI
os.environ['OPENROUTER_API_KEY'] = os.getenv('OPENROUTER_API_KEY', '')


# Create the agent without custom tools to avoid conflicts
agent = Agent(
    model='openrouter:openai/gpt-4o-mini',
    system_prompt=dedent("""
        You are an AI document editor that helps users write and edit documents in markdown format.
        
        CRITICAL RULE: When the user asks you to edit, complete, or continue their document,
        you MUST ALWAYS respond with a code block containing the full document. NO EXCEPTIONS.
        
        The current document content is provided as context: "Current document content in the editor"
        
        When the user mentions:
        - "complete", "continue", "finish", "add more", "write more"
        - "the document", "the story", "it" (referring to their document)
        - Any request to edit or modify content
        
        YOU MUST respond in EXACTLY this format:
        
        ```markdown
        [PUT THE COMPLETE DOCUMENT HERE INCLUDING OLD AND NEW CONTENT]
        ```
        
        EXAMPLE - If document contains "There was a boy" and user says "continue the story":
        
        ```markdown
        There was a boy who lived in a small village by the sea. Every morning, 
        he would walk along the shore, collecting shells and watching the waves...
        ```
        
        NEVER say "I've updated the document" or "Here's the continuation" outside the code block.
        The code block IS your response. Put ALL document content inside the code block.
        
        For general chat/questions, respond normally without code blocks.
    """)
)


# Convert to AG-UI app
try:
    app = agent.to_ag_ui()
except Exception as e:
    print(f"Failed to create AG-UI app for predictive_state_updates: {e}")
    # Fallback: create basic FastAPI app
    from fastapi import FastAPI
    app = FastAPI()
    
    @app.get("/")
    async def health():
        return {"status": "ok", "agent": "predictive_state_updates"}