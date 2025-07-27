"""Agentic Generative UI feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import asyncio
import os
from textwrap import dedent
from typing import AsyncIterator, List

from pydantic import BaseModel, Field

from ag_ui.core import ComponentModel, CustomEvent, EventType
from pydantic_ai import Agent
from pydantic_ai.ag_ui import AgentDeps


class ProgressStep(BaseModel):
    """A progress step in a long-running task."""
    id: str
    title: str
    status: str = Field(default="pending", description="Status: pending, in_progress, completed, error")
    progress: int = Field(default=0, description="Progress percentage (0-100)")
    message: str = Field(default="", description="Status message")


class ProgressTracker(ComponentModel):
    """Component for displaying progress of long-running tasks."""
    type: str = "progress_tracker"
    steps: List[ProgressStep]
    overall_progress: int = Field(default=0, description="Overall progress percentage")


# Create the agent
agent = Agent(
    model=os.getenv('OPENAI_MODEL', 'openai:gpt-4o-mini'),
    deps_type=AgentDeps,
    system_prompt=dedent("""
        You are an AI assistant that helps with long-running tasks.
        When the user requests a complex operation, break it down into steps
        and provide real-time progress updates using the progress tracking tools.
        Simulate progress updates to demonstrate the UI capabilities.
    """)
)


@agent.tool_plain
async def start_long_running_task(task_type: str) -> AsyncIterator[CustomEvent]:
    """Start a long-running task with progress updates.
    
    Args:
        task_type: Type of task to perform (e.g., 'data_processing', 'deployment', 'analysis')
    
    Yields:
        Progress update events
    """
    # Define steps based on task type
    if "deploy" in task_type.lower():
        steps = [
            ProgressStep(id="1", title="Installing dependencies", status="pending"),
            ProgressStep(id="2", title="Running build process", status="pending"),
            ProgressStep(id="3", title="Running tests", status="pending"),
            ProgressStep(id="4", title="Deploying to production", status="pending"),
            ProgressStep(id="5", title="Verifying deployment", status="pending"),
        ]
    elif "data" in task_type.lower() or "analysis" in task_type.lower():
        steps = [
            ProgressStep(id="1", title="Loading dataset", status="pending"),
            ProgressStep(id="2", title="Data preprocessing", status="pending"),
            ProgressStep(id="3", title="Feature extraction", status="pending"),
            ProgressStep(id="4", title="Model training", status="pending"),
            ProgressStep(id="5", title="Generating insights", status="pending"),
        ]
    else:
        steps = [
            ProgressStep(id="1", title="Initializing task", status="pending"),
            ProgressStep(id="2", title="Processing request", status="pending"),
            ProgressStep(id="3", title="Optimizing results", status="pending"),
            ProgressStep(id="4", title="Quality check", status="pending"),
            ProgressStep(id="5", title="Finalizing output", status="pending"),
        ]
    
    # Simulate progress updates
    for i, step in enumerate(steps):
        # Update current step to in_progress
        step.status = "in_progress"
        step.message = f"Working on {step.title.lower()}..."
        
        # Update previous steps to completed
        for j in range(i):
            steps[j].status = "completed"
            steps[j].progress = 100
            steps[j].message = "✅ Complete"
        
        # Yield progress update
        overall_progress = int((i / len(steps)) * 100)
        
        yield CustomEvent(
            type=EventType.CUSTOM,
            name="progress_update",
            value=ProgressTracker(
                steps=steps,
                overall_progress=overall_progress
            ).model_dump()
        )
        
        # Simulate work with incremental progress
        for progress in [25, 50, 75, 100]:
            await asyncio.sleep(0.5)  # Simulate work
            step.progress = progress
            
            yield CustomEvent(
                type=EventType.CUSTOM,
                name="progress_update",
                value=ProgressTracker(
                    steps=steps,
                    overall_progress=overall_progress + int((progress / 100) * (100 / len(steps)))
                ).model_dump()
            )
        
        # Mark step as completed
        step.status = "completed"
        step.message = "✅ Complete"
    
    # Final update with all steps completed
    yield CustomEvent(
        type=EventType.CUSTOM,
        name="progress_update",
        value=ProgressTracker(
            steps=steps,
            overall_progress=100
        ).model_dump()
    )


@agent.tool_plain
async def get_task_status() -> str:
    """Get the current status of the running task.
    
    Returns:
        Status summary
    """
    return "Task is running. Check the progress tracker above for real-time updates."


# Convert to AG-UI app
app = agent.to_ag_ui(deps=AgentDeps())