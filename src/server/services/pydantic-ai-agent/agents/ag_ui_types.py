"""Shared AG-UI types and base classes for Pydantic AI agents."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class EventType(str, Enum):
    """Event types for AG-UI protocol."""
    INTERACTABLE = "interactable"
    STATE_SNAPSHOT = "state_snapshot"
    CUSTOM = "custom"


class ComponentModel(BaseModel):
    """Base class for AG-UI components."""
    type: str = Field(description="The component type")
    
    class Config:
        extra = "allow"


class AgentDeps(BaseModel):
    """Base class for agent dependencies."""
    
    class Config:
        extra = "allow"


class StateDeps(BaseModel):
    """State dependencies wrapper for agents."""
    
    def __init__(self, state_type=None):
        super().__init__()
        self.state_type = state_type
    
    def __class_getitem__(cls, item):
        """Support for generic type hints like StateDeps[MyState]."""
        return cls


class BaseEvent(BaseModel):
    """Base class for AG-UI events."""
    type: EventType
    
    class Config:
        extra = "allow"


class InteractableEvent(BaseEvent):
    """Event for interactive components."""
    type: EventType = EventType.INTERACTABLE
    element: ComponentModel
    next_question: Optional[str] = None


class StateSnapshotEvent(BaseEvent):
    """Event for state snapshots."""
    type: EventType = EventType.STATE_SNAPSHOT
    snapshot: Dict[str, Any]


class CustomEvent(BaseEvent):
    """Event for custom actions."""
    type: EventType = EventType.CUSTOM
    name: str
    value: Any = None


# Recipe-related classes for shared_state.py
class Recipe(BaseModel):
    """A recipe model."""
    name: str = "Untitled Recipe"
    ingredients: List[str] = Field(default_factory=list)
    instructions: List[str] = Field(default_factory=list)
    prep_time: str = "Unknown"
    cook_time: str = "Unknown"
    servings: int = 1
    difficulty: str = "Medium"


class RecipeSnapshot(BaseModel):
    """Snapshot containing recipe state."""
    recipe: Recipe = Field(
        default_factory=Recipe,
        description='The current state of the recipe'
    )