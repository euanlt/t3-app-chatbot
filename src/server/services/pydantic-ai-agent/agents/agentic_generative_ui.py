"""Agentic Generative UI feature using Pydantic AI with AG-UI protocol."""

import os
import asyncio
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from .ag_ui_types import AgentDeps, StateDeps

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Set OpenRouter API key for Pydantic AI
os.environ['OPENROUTER_API_KEY'] = os.getenv('OPENROUTER_API_KEY', '')

# Define state model
class TaskProgress(BaseModel):
    """Progress state for task execution."""
    steps: List[Dict[str, Any]] = Field(default_factory=list)

# Create the agent with state support
agent = Agent(
    model='openrouter:openai/gpt-4o-mini',
    system_prompt="""
    You are an AI assistant that shows real-time progress for complex operations.
    
    When the user asks you to do something complex:
    1. Break it down into logical steps
    2. Use update_task_progress to show progress as you work through each step
    3. Update each step to "completed" as you finish it
    
    Example tasks that need progress:
    - Deploying applications (build, test, deploy steps)
    - Analyzing data (load, process, analyze steps)
    - Setting up infrastructure (configure, provision, verify steps)
    - Running complex calculations (prepare, compute, validate steps)
    
    Always show realistic progress updates and complete steps as you go.
    """,
    deps_type=StateDeps[TaskProgress]
)

@agent.tool
async def update_task_progress(
    ctx: RunContext[StateDeps[TaskProgress]],
    steps: List[Dict[str, str]]
) -> str:
    """Update the task progress state.
    
    Args:
        steps: List of steps with 'description' and 'status' ('pending' or 'completed')
    
    Returns:
        Confirmation message
    """
    # Update the state
    await ctx.deps.state.set_state(TaskProgress(steps=steps))
    
    # Simulate some progress
    completed_count = sum(1 for step in steps if step.get('status') == 'completed')
    total_count = len(steps)
    
    if completed_count == total_count:
        return f"All {total_count} steps completed successfully!"
    else:
        return f"Progress: {completed_count}/{total_count} steps completed"


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
        return {"status": "ok", "agent": "agentic_generative_ui"}