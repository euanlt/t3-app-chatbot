"""Predictive State Updates feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import asyncio
import os
from textwrap import dedent
from typing import AsyncIterator, List, Tuple

from pydantic import BaseModel, Field

from pydantic_ai import Agent, RunContext
from .ag_ui_types import CustomEvent, EventType, StateDeps

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Set OpenRouter API key for Pydantic AI
os.environ['OPENROUTER_API_KEY'] = os.getenv('OPENROUTER_API_KEY', '')


class DocumentState(BaseModel):
    """State for the document being written."""
    document: str = ''


# Create the agent with state dependencies
agent = Agent(
    model='openrouter:openai/gpt-4o-mini',
    system_prompt=dedent("""
        You are an AI document editor that helps users write and edit documents.
        
        When the user asks you to help with writing:
        1. Understand what they want to write about
        2. Use the write_document tool to create or update content
        3. The tool will show a preview of changes for user approval
        
        When the user asks you to edit existing content:
        1. Read the current document state
        2. Make the requested changes
        3. Use write_document to present the changes for approval
        
        Always provide helpful, well-structured content that matches the user's request.
    """),
    deps_type=StateDeps[DocumentState]
)


# Simple tool that updates document state
@agent.tool
async def write_document(
    ctx: RunContext[StateDeps[DocumentState]],
    document: str
) -> str:
    """Write or update the document content.
    
    Args:
        document: The new document content in markdown format
    
    Returns:
        Confirmation message
    """
    # Update the state
    await ctx.deps.state.set_state(DocumentState(document=document))
    
    # Return confirmation
    return f"Document updated successfully. The document now contains {len(document.split())} words."


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