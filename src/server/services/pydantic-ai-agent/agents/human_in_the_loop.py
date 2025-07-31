"""Human in the Loop feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import os
from textwrap import dedent
from typing import List

from pydantic import BaseModel, Field

from pydantic_ai import Agent, RunContext
from .ag_ui_types import ComponentModel, AgentDeps, InteractableEvent, EventType, CustomEvent

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Set OpenRouter API key for Pydantic AI
os.environ['OPENROUTER_API_KEY'] = os.getenv('OPENROUTER_API_KEY', '')


class TaskStep(BaseModel):
    """A single task step."""
    id: str
    description: str
    priority: str = Field(default="medium", description="Priority: high, medium, or low")
    status: str = Field(default="pending", description="Status: pending, approved, rejected")


class TaskApproval(ComponentModel):
    """Component for task approval UI."""
    type: str = "task_approval"
    steps: List[TaskStep]


# Create the agent with dependencies
agent = Agent(
    model='openrouter:openai/gpt-4o-mini',
    system_prompt=dedent("""
        You are a collaborative task planning assistant with interactive approval workflows.
        
        When the user describes a project or task, follow these steps:
        1. Use ui_show_task_approval to break down the task into manageable steps and display them in an interactive approval interface
        2. The user can then approve/reject individual tasks or approve all at once
        
        After getting approvals, help them proceed with the approved tasks.
        
        Always break down complex projects into 3-7 specific, actionable steps.
    """)
)


@agent.tool_plain
async def ui_show_task_approval(
    task_description: str,
    num_steps: int = 5
) -> CustomEvent:
    """Create a task breakdown for user approval using the React UI component.
    
    Args:
        task_description: Description of the task to break down
        num_steps: Number of steps to create (default: 5)
    
    Returns:
        Custom event that triggers the task approval UI
    """
    # Generate task steps based on the description
    steps = []
    
    # Simple task generation logic
    if "website" in task_description.lower():
        steps = [
            {"description": "Create wireframes and design mockups", "status": "enabled"},
            {"description": "Set up project structure and dependencies", "status": "enabled"},
            {"description": "Implement responsive layout", "status": "enabled"},
            {"description": "Add interactive features", "status": "enabled"},
            {"description": "Test and deploy", "status": "enabled"},
        ]
    elif "api" in task_description.lower():
        steps = [
            {"description": "Design API endpoints and data models", "status": "enabled"},
            {"description": "Set up database schema", "status": "enabled"},
            {"description": "Implement authentication", "status": "enabled"},
            {"description": "Add validation and error handling", "status": "enabled"},
            {"description": "Write documentation", "status": "enabled"},
        ]
    else:
        # Generic steps
        steps = [
            {"description": f"Step {i+1}: {task_description[:50]}...", "status": "enabled"}
            for i in range(num_steps)
        ]
    
    # Return custom event that will trigger the React component
    return CustomEvent(
        type=EventType.CUSTOM,
        name="task_approval",
        value={"steps": steps[:num_steps]}
    )


@agent.tool_plain
async def process_approved_tasks(
    approved_task_ids: List[str]
) -> str:
    """Process the tasks that were approved by the user.
    
    Args:
        approved_task_ids: List of task IDs that were approved
    
    Returns:
        Summary of what will be done
    """
    if not approved_task_ids:
        return "No tasks were approved. Let me know if you'd like to revise the task list."
    
    return (
        f"Great! I'll help you with the {len(approved_task_ids)} approved tasks. "
        f"Let's start with the highest priority items first. "
        f"Which task would you like to begin with?"
    )


# Convert to AG-UI app
try:
    app = agent.to_ag_ui()
except Exception as e:
    print(f"Failed to create AG-UI app for human_in_the_loop: {e}")
    # Fallback: create basic FastAPI app
    from fastapi import FastAPI
    app = FastAPI()
    
    @app.get("/")
    async def health():
        return {"status": "ok", "agent": "human_in_the_loop"}