"""Shared State feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import os
from enum import StrEnum
from textwrap import dedent
from typing import List

from pydantic import BaseModel, Field

from ag_ui.core import EventType, StateSnapshotEvent
from pydantic_ai import Agent, RunContext
from pydantic_ai.ag_ui import StateDeps


class SkillLevel(StrEnum):
    """The level of skill required for the recipe."""
    BEGINNER = 'Beginner'
    INTERMEDIATE = 'Intermediate'
    ADVANCED = 'Advanced'


class SpecialPreferences(StrEnum):
    """Special preferences for the recipe."""
    HIGH_PROTEIN = 'High Protein'
    LOW_CARB = 'Low Carb'
    SPICY = 'Spicy'
    BUDGET_FRIENDLY = 'Budget-Friendly'
    ONE_POT_MEAL = 'One-Pot Meal'
    VEGETARIAN = 'Vegetarian'
    VEGAN = 'Vegan'
    GLUTEN_FREE = 'Gluten-Free'


class CookingTime(StrEnum):
    """The cooking time of the recipe."""
    FIVE_MIN = '5 min'
    FIFTEEN_MIN = '15 min'
    THIRTY_MIN = '30 min'
    FORTY_FIVE_MIN = '45 min'
    SIXTY_PLUS_MIN = '60+ min'


class Ingredient(BaseModel):
    """A class representing an ingredient in a recipe."""
    icon: str = Field(
        default='🥘',
        description="The icon emoji for the ingredient"
    )
    name: str
    amount: str


class Recipe(BaseModel):
    """A class representing a recipe."""
    skill_level: SkillLevel = Field(
        default=SkillLevel.BEGINNER,
        description='The skill level required for the recipe'
    )
    special_preferences: List[SpecialPreferences] = Field(
        default_factory=list,
        description='Any special preferences for the recipe'
    )
    cooking_time: CookingTime = Field(
        default=CookingTime.FIFTEEN_MIN, 
        description='The cooking time of the recipe'
    )
    ingredients: List[Ingredient] = Field(
        default_factory=list,
        description='Ingredients for the recipe'
    )
    instructions: List[str] = Field(
        default_factory=list, 
        description='Instructions for the recipe'
    )


class RecipeSnapshot(BaseModel):
    """A class representing the state of the recipe."""
    recipe: Recipe = Field(
        default_factory=Recipe, 
        description='The current state of the recipe'
    )


# Create the agent with state dependencies
agent = Agent(
    model=os.getenv('OPENAI_MODEL', 'openai:gpt-4o-mini'),
    deps_type=StateDeps[RecipeSnapshot],
    system_prompt=dedent("""
        You are a helpful assistant for creating recipes.
        
        You have access to a shared recipe state that both you and the user can modify.
        The user can update preferences, ingredients, and other recipe details through the UI.
        
        IMPORTANT:
        - Build upon the existing recipe state
        - Don't remove existing ingredients unless asked
        - Use the display_recipe tool to show the updated recipe
        - Be creative and suggest improvements based on user preferences
    """)
)


@agent.tool_plain
async def display_recipe(recipe: Recipe) -> StateSnapshotEvent:
    """Display the recipe to the user.
    
    Args:
        recipe: The recipe to display.
    
    Returns:
        StateSnapshotEvent containing the recipe snapshot.
    """
    return StateSnapshotEvent(
        type=EventType.STATE_SNAPSHOT,
        snapshot={'recipe': recipe.model_dump()}
    )


@agent.tool
async def add_ingredients(
    ctx: RunContext[StateDeps[RecipeSnapshot]],
    ingredients: List[str]
) -> StateSnapshotEvent:
    """Add ingredients to the recipe.
    
    Args:
        ingredients: List of ingredient descriptions (e.g., ["2 cups flour", "1 tsp salt"])
    
    Returns:
        Updated recipe state
    """
    current_recipe = ctx.deps.state.recipe
    
    # Parse ingredients and add to recipe
    for ing_text in ingredients:
        # Simple parsing - in real app would be more sophisticated
        parts = ing_text.split(' ', 2)
        if len(parts) >= 3:
            amount = f"{parts[0]} {parts[1]}"
            name = parts[2]
        else:
            amount = "to taste"
            name = ing_text
        
        # Choose appropriate emoji based on ingredient
        icon = '🥘'  # Default
        if any(word in name.lower() for word in ['tomato', 'pepper', 'chili']):
            icon = '🍅'
        elif any(word in name.lower() for word in ['cheese', 'milk', 'cream']):
            icon = '🧀'
        elif any(word in name.lower() for word in ['meat', 'chicken', 'beef']):
            icon = '🥩'
        elif any(word in name.lower() for word in ['herb', 'basil', 'oregano']):
            icon = '🌿'
        elif any(word in name.lower() for word in ['oil', 'butter']):
            icon = '🫒'
        
        current_recipe.ingredients.append(
            Ingredient(icon=icon, name=name, amount=amount)
        )
    
    return StateSnapshotEvent(
        type=EventType.STATE_SNAPSHOT,
        snapshot={'recipe': current_recipe.model_dump()}
    )


@agent.tool
async def update_recipe_preferences(
    ctx: RunContext[StateDeps[RecipeSnapshot]],
    skill_level: SkillLevel = None,
    cooking_time: CookingTime = None,
    special_preferences: List[SpecialPreferences] = None
) -> StateSnapshotEvent:
    """Update recipe preferences.
    
    Args:
        skill_level: New skill level
        cooking_time: New cooking time
        special_preferences: List of special preferences
    
    Returns:
        Updated recipe state
    """
    current_recipe = ctx.deps.state.recipe
    
    if skill_level:
        current_recipe.skill_level = skill_level
    if cooking_time:
        current_recipe.cooking_time = cooking_time
    if special_preferences is not None:
        current_recipe.special_preferences = special_preferences
    
    return StateSnapshotEvent(
        type=EventType.STATE_SNAPSHOT,
        snapshot={'recipe': current_recipe.model_dump()}
    )


@agent.tool
async def generate_instructions(
    ctx: RunContext[StateDeps[RecipeSnapshot]]
) -> StateSnapshotEvent:
    """Generate cooking instructions based on current ingredients.
    
    Returns:
        Updated recipe with instructions
    """
    current_recipe = ctx.deps.state.recipe
    
    # Generate basic instructions based on ingredients
    instructions = []
    
    # Prep step
    if current_recipe.ingredients:
        instructions.append("Prepare all ingredients by washing and chopping as needed")
    
    # Check for common cooking patterns
    has_pasta = any('pasta' in ing.name.lower() for ing in current_recipe.ingredients)
    has_meat = any(word in ing.name.lower() for ing in current_recipe.ingredients 
                   for word in ['meat', 'chicken', 'beef', 'pork'])
    has_vegetables = any(word in ing.name.lower() for ing in current_recipe.ingredients 
                        for word in ['onion', 'garlic', 'pepper', 'tomato', 'vegetable'])
    
    if has_pasta:
        instructions.append("Bring a large pot of salted water to boil")
    
    if has_vegetables:
        instructions.append("Heat oil in a large pan over medium heat")
        instructions.append("Sauté vegetables until softened")
    
    if has_meat:
        instructions.append("Season meat with salt and pepper")
        instructions.append("Cook meat until browned and cooked through")
    
    if has_pasta:
        instructions.append("Cook pasta according to package directions")
        instructions.append("Reserve 1 cup pasta water before draining")
    
    # Combining step
    instructions.append("Combine all cooked ingredients")
    instructions.append("Season to taste and serve hot")
    
    current_recipe.instructions = instructions
    
    return StateSnapshotEvent(
        type=EventType.STATE_SNAPSHOT,
        snapshot={'recipe': current_recipe.model_dump()}
    )


# Convert to AG-UI app with initial state
app = agent.to_ag_ui(deps=StateDeps(RecipeSnapshot()))