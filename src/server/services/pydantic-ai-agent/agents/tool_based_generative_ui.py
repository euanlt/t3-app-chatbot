"""Tool Based Generative UI agent - creates haikus, recipes, and code snippets."""

import os
import random
from typing import List, Optional
from pydantic import BaseModel, Field
from pydantic_ai import Agent

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Set OpenRouter API key for Pydantic AI
os.environ['OPENROUTER_API_KEY'] = os.getenv('OPENROUTER_API_KEY', '')

# Data models are now handled by the frontend React components
# Tools return simple strings and the frontend handles the rich UI display

# Create the agent
agent = Agent(
    model='openrouter:openai/gpt-4o-mini',
    system_prompt="""
    You are a creative AI assistant that generates beautiful content including haikus, recipes, and code snippets.
    
    When users ask you to create content, follow these steps:
    1. Use the appropriate creation tool:
       - create_haiku(theme): Creates a haiku poem
       - create_recipe(cuisine, dietary): Creates a cooking recipe  
       - create_code_snippet(language, purpose): Creates a code snippet
    
    2. After the tool returns content, call the corresponding UI display tool to show it in the interface:
       - ui_display_haiku: Pass title, lines (as array), and theme
       - ui_display_recipe: Pass name, ingredients (as array), steps (as array), prep_time, and servings
       - ui_display_code_snippet: Pass title, language, code, and explanation
    
    Always call the UI display tool after generating content to show it in the rich UI format.
    Be artistic and thoughtful in your creations.
    """
)

@agent.tool_plain
async def create_haiku(theme: Optional[str] = None) -> dict:
    """Generate a beautiful haiku poem and display it in the UI.
    
    Args:
        theme: Optional theme for the haiku (e.g., 'nature', 'technology', 'love')
    
    Returns:
        A dict containing the haiku data (title, lines, theme) that will be rendered in the UI
    """
    themes = ['nature', 'technology', 'seasons', 'love', 'wisdom', 'time']
    if not theme:
        theme = random.choice(themes)
    
    # Generate different haikus based on theme
    haiku_variations = {
        'nature': {
            'title': 'Nature\'s Whisper',
            'lines': [
                'Morning dew glistens',
                'On petals soft as silk dreams',
                'Spring awakens earth'
            ]
        },
        'technology': {
            'title': 'Digital Dreams',
            'lines': [
                'Code flows like water',
                'Binary thoughts crystallize',
                'Silicon wisdom'
            ]
        },
        'love': {
            'title': 'Heart\'s Echo',
            'lines': [
                'Two hearts beat as one',
                'In rhythm with the cosmos',
                'Love transcends all time'
            ]
        }
    }
    
    # Use theme-specific haiku or default
    haiku_data = haiku_variations.get(theme, {
        'title': f'Thoughts on {theme.title()}',
        'lines': [
            'Moments drift like clouds',
            'Each breath a small infinity',
            'Life unfolds in verse'
        ]
    })
    
    haiku_data['theme'] = theme
    
    # Return the haiku data - CopilotKit will render this using the matching frontend action
    return haiku_data

@agent.tool_plain
async def create_recipe(cuisine: Optional[str] = None, dietary: Optional[str] = None) -> dict:
    """Generate a cooking recipe and display it in the UI.
    
    Args:
        cuisine: Type of cuisine (e.g., 'Italian', 'Japanese', 'Mexican')
        dietary: Dietary restrictions (e.g., 'vegetarian', 'vegan', 'gluten-free')
    
    Returns:
        RecipeContent object with name, ingredients, steps, prep_time, and servings
    """
    cuisine = cuisine or "Italian"
    dietary = dietary or "regular"
    
    # Generate different recipes based on cuisine
    recipe_variations = {
        'italian': {
            'name': 'Classic Pasta Marinara',
            'ingredients': [
                '2 cups penne pasta',
                '1 cup marinara sauce',
                '1/2 cup parmesan cheese',
                'Fresh basil leaves',
                '2 tbsp olive oil',
                '2 cloves garlic'
            ],
            'steps': [
                'Boil salted water and cook pasta al dente',
                'Heat olive oil and sauté minced garlic',
                'Add marinara sauce and simmer',
                'Toss pasta with sauce',
                'Top with parmesan and fresh basil'
            ],
            'prep_time': '20 minutes',
            'servings': 4
        },
        'japanese': {
            'name': 'Simple Chicken Teriyaki',
            'ingredients': [
                '2 chicken breasts',
                '1/4 cup soy sauce',
                '2 tbsp mirin',
                '1 tbsp sugar',
                '1 tsp sesame oil',
                'Green onions for garnish'
            ],
            'steps': [
                'Cut chicken into bite-sized pieces',
                'Mix soy sauce, mirin, and sugar for sauce',
                'Cook chicken in sesame oil until golden',
                'Add sauce and simmer until glazed',
                'Garnish with chopped green onions'
            ],
            'prep_time': '15 minutes',
            'servings': 2
        }
    }
    
    # Use cuisine-specific recipe or default to Italian
    recipe_data = recipe_variations.get(cuisine.lower(), recipe_variations['italian'])
    
    return recipe_data

@agent.tool_plain
async def create_code_snippet(language: str, purpose: str) -> dict:
    """Generate a code snippet and display it in the UI.
    
    Args:
        language: Programming language (e.g., 'Python', 'JavaScript', 'TypeScript')
        purpose: What the code should do
    
    Returns:
        CodeSnippet object with language, code, explanation, and title
    """
    # Generate different code snippets based on language and purpose
    if language.lower() == 'python':
        if 'hello' in purpose.lower():
            code = f'# {purpose}\ndef greet(name="World"):\n    return f"Hello, {{name}}!"\n\nprint(greet())'
            title = f"Python Hello World - {purpose}"
            explanation = "A simple Python function that greets users with customizable names."
        else:
            code = f'# {purpose}\ndef example_function():\n    """{purpose}"""\n    result = "This demonstrates {purpose}"\n    return result\n\nprint(example_function())'
            title = f"Python Function - {purpose}"
            explanation = f"A Python function demonstrating {purpose} with proper documentation and return value."
    elif language.lower() in ['javascript', 'js']:
        if 'hello' in purpose.lower():
            code = f'// {purpose}\nfunction greet(name = "World") {{\n    return `Hello, ${{name}}!`;\n}}\n\nconsole.log(greet());'
            title = f"JavaScript Hello World - {purpose}"
            explanation = "A JavaScript function using template literals for dynamic greetings."
        else:
            code = f'// {purpose}\nfunction exampleFunction() {{\n    // {purpose}\n    const result = "This demonstrates {purpose}";\n    return result;\n}}\n\nconsole.log(exampleFunction());'
            title = f"JavaScript Function - {purpose}"
            explanation = f"A JavaScript function demonstrating {purpose} with modern ES6 syntax."
    else:
        code = f"// {purpose} in {language}\nfunction example() {{\n    return 'Example for {purpose}';\n}}"
        title = f"{language} Example - {purpose}"
        explanation = f"A basic {language} function template for {purpose}."
    
    return {
        "language": language,
        "code": code,
        "explanation": explanation,
        "title": title
    }

# Note: The frontend CopilotKit actions with matching names (create_haiku, create_recipe, create_code_snippet)
# will automatically render the data returned by these tools using their render functions.
# This follows the AG-UI protocol pattern where tool calls directly trigger UI rendering.

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
        return {"status": "ok", "agent": "tool_based_generative_ui"}