"""Tool Based Generative UI feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import os
import random
from textwrap import dedent
from typing import List, Optional

from pydantic import BaseModel, Field

from ag_ui.core import ComponentModel, CustomEvent, EventType
from pydantic_ai import Agent
from pydantic_ai.ag_ui import AgentDeps


class HaikuContent(ComponentModel):
    """A haiku poem with metadata."""
    type: str = "haiku"
    title: str
    lines: List[str] = Field(description="Three lines of the haiku")
    theme: str
    mood: str
    syllables: List[int] = Field(description="Syllable count for each line")


class RecipeContent(ComponentModel):
    """A recipe with ingredients and instructions."""
    type: str = "recipe"
    title: str
    description: str
    prep_time: str
    cook_time: str
    servings: int
    ingredients: List[str]
    instructions: List[str]
    difficulty: str = Field(default="medium", description="easy, medium, hard")


class CodeSnippet(ComponentModel):
    """A code snippet with syntax highlighting."""
    type: str = "code"
    title: str
    language: str
    code: str
    description: str
    concepts: List[str] = Field(default_factory=list)


# Create the agent
agent = Agent(
    model=os.getenv('OPENAI_MODEL', 'openai:gpt-4o-mini'),
    deps_type=AgentDeps,
    system_prompt=dedent("""
        You are a creative AI assistant that generates beautiful, structured content.
        When asked, you can create haikus, recipes, code snippets, and other formatted content.
        Use the appropriate tools to generate richly formatted outputs.
    """)
)


@agent.tool_plain
async def generate_haiku(theme: Optional[str] = None) -> List[CustomEvent]:
    """Generate a beautiful haiku poem.
    
    Args:
        theme: Optional theme for the haiku (e.g., 'nature', 'technology', 'love')
    
    Returns:
        Formatted haiku component
    """
    # Generate haiku based on theme
    if not theme:
        theme = random.choice(['nature', 'technology', 'seasons', 'emotions'])
    
    haikus = {
        'nature': HaikuContent(
            title="Mountain Serenity",
            lines=[
                "Ancient mountains stand",
                "Mist dances through silent pines",
                "Peace in morning light"
            ],
            theme=theme,
            mood="peaceful",
            syllables=[5, 7, 5]
        ),
        'technology': HaikuContent(
            title="Digital Dreams",
            lines=[
                "Code flows like water",
                "Pixels paint electric dreams",
                "Future births in light"
            ],
            theme=theme,
            mood="innovative",
            syllables=[5, 7, 5]
        ),
        'seasons': HaikuContent(
            title="Autumn's Embrace",
            lines=[
                "Leaves fall gently down",
                "Golden carpet on the path",
                "Winter whispers near"
            ],
            theme=theme,
            mood="nostalgic",
            syllables=[5, 7, 5]
        ),
        'emotions': HaikuContent(
            title="Heart's Journey",
            lines=[
                "Joy blooms in the heart",
                "Through storms and sunshine it grows",
                "Love's eternal spring"
            ],
            theme=theme,
            mood="uplifting",
            syllables=[5, 7, 5]
        )
    }
    
    haiku = haikus.get(theme, haikus['nature'])
    
    return [
        CustomEvent(
            type=EventType.CUSTOM,
            name="generated_content",
            value=haiku.model_dump()
        )
    ]


@agent.tool_plain
async def generate_recipe(cuisine: str = "italian") -> List[CustomEvent]:
    """Generate a delicious recipe.
    
    Args:
        cuisine: Type of cuisine (italian, asian, mexican, etc.)
    
    Returns:
        Formatted recipe component
    """
    recipes = {
        'italian': RecipeContent(
            title="Classic Margherita Pizza",
            description="A traditional Italian pizza with fresh basil and mozzarella",
            prep_time="30 minutes",
            cook_time="15 minutes",
            servings=4,
            ingredients=[
                "2 cups all-purpose flour",
                "1 tsp active dry yeast",
                "3/4 cup warm water",
                "2 tbsp olive oil",
                "1 tsp salt",
                "1 cup tomato sauce",
                "8 oz fresh mozzarella",
                "Fresh basil leaves",
                "Extra virgin olive oil for drizzling"
            ],
            instructions=[
                "Mix yeast with warm water and let stand for 5 minutes",
                "Combine flour and salt, then add yeast mixture and olive oil",
                "Knead dough for 8-10 minutes until smooth",
                "Let rise in a warm place for 1 hour",
                "Preheat oven to 475°F (245°C)",
                "Roll out dough and top with sauce, cheese, and basil",
                "Bake for 12-15 minutes until crust is golden",
                "Drizzle with olive oil before serving"
            ],
            difficulty="medium"
        ),
        'asian': RecipeContent(
            title="Quick Vegetable Stir-Fry",
            description="A colorful and healthy Asian-inspired stir-fry",
            prep_time="15 minutes",
            cook_time="10 minutes",
            servings=4,
            ingredients=[
                "2 tbsp vegetable oil",
                "1 bell pepper, sliced",
                "1 cup broccoli florets",
                "1 carrot, julienned",
                "2 cloves garlic, minced",
                "2 tbsp soy sauce",
                "1 tbsp oyster sauce",
                "1 tsp sesame oil",
                "1 tsp cornstarch",
                "Sesame seeds for garnish"
            ],
            instructions=[
                "Heat oil in a wok or large pan over high heat",
                "Add garlic and stir-fry for 30 seconds",
                "Add harder vegetables (broccoli, carrot) first",
                "Stir-fry for 2-3 minutes",
                "Add bell pepper and continue cooking",
                "Mix sauces with cornstarch and 2 tbsp water",
                "Pour sauce over vegetables and toss",
                "Cook until sauce thickens, about 1 minute",
                "Garnish with sesame seeds and serve"
            ],
            difficulty="easy"
        )
    }
    
    recipe = recipes.get(cuisine.lower(), recipes['italian'])
    
    return [
        CustomEvent(
            type=EventType.CUSTOM,
            name="generated_content",
            value=recipe.model_dump()
        )
    ]


@agent.tool_plain
async def generate_code_snippet(
    purpose: str = "hello_world",
    language: str = "python"
) -> List[CustomEvent]:
    """Generate a code snippet.
    
    Args:
        purpose: What the code should do (hello_world, fibonacci, api_request, etc.)
        language: Programming language (python, javascript, typescript, etc.)
    
    Returns:
        Formatted code snippet component
    """
    snippets = {
        'hello_world': {
            'python': CodeSnippet(
                title="Hello World in Python",
                language="python",
                code='''def greet(name: str = "World") -> str:
    """Generate a personalized greeting."""
    return f"Hello, {name}! 👋"

if __name__ == "__main__":
    print(greet())
    print(greet("Python Developer"))''',
                description="A simple greeting function with type hints",
                concepts=["functions", "type hints", "f-strings", "default parameters"]
            ),
            'javascript': CodeSnippet(
                title="Hello World in JavaScript",
                language="javascript",
                code='''function greet(name = "World") {
    return `Hello, ${name}! 👋`;
}

// Modern arrow function version
const modernGreet = (name = "World") => `Hello, ${name}! 👋`;

console.log(greet());
console.log(modernGreet("JavaScript Developer"));''',
                description="Greeting functions using both traditional and arrow syntax",
                concepts=["functions", "arrow functions", "template literals", "default parameters"]
            )
        },
        'fibonacci': {
            'python': CodeSnippet(
                title="Fibonacci Sequence Generator",
                language="python",
                code='''def fibonacci(n: int) -> list[int]:
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[-1] + sequence[-2])
    
    return sequence

# Generator version for memory efficiency
def fibonacci_generator(n: int):
    """Generate Fibonacci numbers one at a time."""
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

# Example usage
print(f"First 10 Fibonacci numbers: {fibonacci(10)}")
print(f"Using generator: {list(fibonacci_generator(10))}")''',
                description="Fibonacci sequence implementation with both list and generator approaches",
                concepts=["loops", "generators", "yield", "list comprehension", "type hints"]
            )
        }
    }
    
    snippet_key = purpose.lower()
    if snippet_key not in snippets:
        snippet_key = 'hello_world'
    
    language_key = language.lower()
    if language_key not in snippets[snippet_key]:
        language_key = 'python'
    
    snippet = snippets[snippet_key][language_key]
    
    return [
        CustomEvent(
            type=EventType.CUSTOM,
            name="generated_content",
            value=snippet.model_dump()
        )
    ]


# Convert to AG-UI app
app = agent.to_ag_ui(deps=AgentDeps())