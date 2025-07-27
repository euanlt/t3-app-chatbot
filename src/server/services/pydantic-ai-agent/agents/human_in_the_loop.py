"""Human in the Loop feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import os
from textwrap import dedent
from typing import List

from pydantic import BaseModel, Field

from ag_ui.core import ComponentModel, EventType, InteractableEvent
from pydantic_ai import Agent, RunContext
from pydantic_ai.ag_ui import AgentDeps


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
    model=os.getenv('OPENAI_MODEL', 'openai:gpt-4o-mini'),
    deps_type=AgentDeps,
    system_prompt=dedent("""
        You are a collaborative task planning assistant.
        When the user describes a project or task, break it down into manageable steps.
        Present these steps for approval using the task approval tool.
        Wait for user feedback on which steps to proceed with.
    """)
)


@agent.tool_plain
async def create_task_breakdown(
    task_description: str,
    num_steps: int = 5
) -> List[InteractableEvent]:
    """Create a task breakdown for user approval.
    
    Args:
        task_description: Description of the task to break down
        num_steps: Number of steps to create (default: 5)
    
    Returns:
        Interactive task approval component
    """
    # Generate task steps based on the description
    steps = []
    
    # Simple task generation logic (in a real app, this would be more sophisticated)
    if "website" in task_description.lower():
        steps = [
            TaskStep(id="1", description="Create wireframes and design mockups", priority="high"),
            TaskStep(id="2", description="Set up project structure and dependencies", priority="high"),
            TaskStep(id="3", description="Implement responsive layout", priority="medium"),
            TaskStep(id="4", description="Add interactive features", priority="medium"),
            TaskStep(id="5", description="Test and deploy", priority="low"),
        ]
    elif "api" in task_description.lower():
        steps = [
            TaskStep(id="1", description="Design API endpoints and data models", priority="high"),
            TaskStep(id="2", description="Set up database schema", priority="high"),
            TaskStep(id="3", description="Implement authentication", priority="medium"),
            TaskStep(id="4", description="Add validation and error handling", priority="medium"),
            TaskStep(id="5", description="Write documentation", priority="low"),
        ]
    else:
        # Generic steps
        steps = [
            TaskStep(id=str(i+1), description=f"Step {i+1}: {task_description[:30]}...", priority="medium")
            for i in range(num_steps)
        ]
    
    # Return interactable component
    return [
        InteractableEvent(
            type=EventType.INTERACTABLE,
            element=TaskApproval(steps=steps[:num_steps]),
            next_question="Please review these tasks and let me know which ones you'd like to proceed with."
        )
    ]


@agent.tool
async def process_approved_tasks(
    ctx: RunContext[AgentDeps],
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
app = agent.to_ag_ui(deps=AgentDeps())