"""Predictive State Updates feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import asyncio
import os
from textwrap import dedent
from typing import AsyncIterator, List, Tuple

from pydantic import BaseModel, Field

from pydantic_ai import Agent, RunContext
from .ag_ui_types import CustomEvent, EventType

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Set OpenRouter API key for Pydantic AI
os.environ['OPENROUTER_API_KEY'] = os.getenv('OPENROUTER_API_KEY', '')


class DocumentState(BaseModel):
    """State for the document being written."""
    document: str = ''


# Create the agent
agent = Agent(
    model='openrouter:openai/gpt-4o-mini',
    system_prompt=dedent("""
        You are an AI document editor that helps users write and edit documents.
        
        When the user asks you to help with writing:
        1. First, use get_document_content to see what's currently in the document
        2. Use the ui_confirm_write tool to create or update content
        3. The tool will show a preview of changes for user approval
        
        When the user asks you to edit existing content:
        1. Use get_document_content to read the current document
        2. Make the requested changes
        3. Use ui_confirm_write to present the changes for approval
        
        Always provide helpful, well-structured content that matches the user's request.
        Write in markdown format with proper headings, lists, and formatting.
    """)
)


# Tool to get current document content
@agent.tool_plain
async def get_document_content() -> CustomEvent:
    """Get the current document content from the editor.
    
    Returns:
        CustomEvent that requests the document content
    """
    return CustomEvent(
        type=EventType.CUSTOM,
        name="get_current_document",
        value={}
    )


# Tool to write document with user confirmation
@agent.tool_plain
async def ui_confirm_write(
    document: str
) -> CustomEvent:
    """Write or update the document content with user confirmation.
    
    Args:
        document: The new document content in markdown format
    
    Returns:
        CustomEvent that triggers the confirmation UI
    """
    return CustomEvent(
        type=EventType.CUSTOM,
        name="confirm_write_document",
        value={"document": document}
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