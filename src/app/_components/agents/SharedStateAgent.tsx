"use client";

import { useState, useEffect } from "react";
import { CopilotKit, useCoAgent, useCopilotChat, useCopilotAction, useCopilotMessagesContext } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";

interface SharedStateAgentProps {
  agentId: string;
  agentName: string;
}

interface Ingredient {
  icon: string;
  name: string;
  amount: string;
}

interface Recipe {
  title: string;
  skill_level: "Beginner" | "Intermediate" | "Advanced";
  special_preferences: string[];
  cooking_time: string;
  ingredients: Ingredient[];
  instructions: string[];
}

interface RecipeAgentState {
  recipe: Recipe;
}

// Component for building and displaying the recipe
function RecipeBuilder({ 
  recipe, 
  updateRecipe,
  isLoading,
  appendMessage
}: { 
  recipe: Recipe;
  updateRecipe: (partialRecipe: Partial<Recipe>) => void;
  changedKeys: string[];
  isLoading: boolean;
  appendMessage: (message: TextMessage) => void;
}) {

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 m-4">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">🍳 Recipe Builder</h3>
      
      {/* Recipe Title */}
      <input
        type="text"
        value={recipe.title || ""}
        onChange={(e) => updateRecipe({ title: e.target.value })}
        className="w-full text-2xl font-bold mb-4 p-2 border-b-2 border-gray-300 focus:border-blue-500 outline-none"
        placeholder="Recipe Title"
      />
      
      {/* Recipe Metadata */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
          <select
            value={recipe.skill_level}
            onChange={(e) => updateRecipe({ skill_level: e.target.value as Recipe['skill_level'] })}
            className="w-full p-2 border rounded"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cooking Time</label>
          <select
            value={recipe.cooking_time}
            onChange={(e) => updateRecipe({ cooking_time: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="5 min">5 min</option>
            <option value="15 min">15 min</option>
            <option value="30 min">30 min</option>
            <option value="45 min">45 min</option>
            <option value="60+ min">60+ min</option>
          </select>
        </div>
      </div>

      {/* Special Preferences */}
      {recipe.special_preferences.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Special Preferences</label>
          <div className="flex flex-wrap gap-2">
            {recipe.special_preferences.map((pref, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {pref}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ingredients */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Ingredients</label>
        <div className="space-y-2">
          {recipe.ingredients.length > 0 ? (
            recipe.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-2xl mr-3">{ingredient.icon}</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{ingredient.amount}</span>
                  <span className="text-gray-600 ml-2">{ingredient.name}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">No ingredients added yet</p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">Instructions</label>
        <div className="space-y-2">
          {recipe.instructions.length > 0 ? (
            recipe.instructions.map((instruction, index) => (
              <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                <span className="bg-blue-500 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">
                  {index + 1}
                </span>
                <p className="text-gray-800 flex-1">{instruction}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">No instructions added yet</p>
          )}
        </div>
      </div>

      {/* Improve with AI Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => {
            if (!isLoading) {
              appendMessage(
                new TextMessage({
                  content: "Improve the recipe",
                  role: Role.User,
                })
              );
            }
          }}
          disabled={isLoading}
          className={`px-6 py-2 rounded font-medium ${
            isLoading 
              ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {isLoading ? "Please Wait..." : "Improve with AI"}
        </button>
      </div>
    </div>
  );
}

// Ping animation component

const INITIAL_STATE: RecipeAgentState = {
  recipe: {
    title: "Build Your Recipe",
    skill_level: "Beginner",
    special_preferences: [],
    cooking_time: "15 min",
    ingredients: [],
    instructions: []
  }
};

// Function to extract recipe information from agent messages
function extractRecipeFromMessage(content: string): Recipe | null {
  try {
    // Look for recipe patterns in the message
    const titleMatch = content.match(/(?:recipe|title):\s*([^\n]+)/i) || 
                      content.match(/^([A-Z][^.\n]+(?:recipe|pasta|chicken|soup|salad|cake|bread))/i);
    
    // Extract ingredients (look for lines with measurements)
    const ingredientMatches = content.match(/(?:ingredients?:?\s*\n?)((?:[-•*]\s*)?(?:\d+(?:\/\d+)?\s*(?:cups?|tbsp|tsp|oz|lbs?|pounds?|grams?|kg|ml|l|liters?|cloves?|pieces?|slices?)\s+[^\n]+\n?)*)/i);
    
    // Extract instructions (look for numbered or bulleted steps)
    const instructionMatches = content.match(/(?:instructions?|steps?|directions?:?\s*\n?)((?:(?:\d+\.?|\d+\)|-|•|●|\*)\s*[^\n]+\n?)*)/i);
    
    // Extract skill level
    const skillMatch = content.match(/(?:skill level|difficulty):?\s*(beginner|intermediate|advanced)/i);
    
    // Extract cooking time
    const timeMatch = content.match(/(?:cooking time|prep time|total time):?\s*(\d+(?:-\d+)?\s*(?:min|minutes?|hrs?|hours?))/i);
    
    if (!titleMatch && !ingredientMatches && !instructionMatches) {
      return null; // No recipe found
    }
    
    const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : "New Recipe";
    
    // Process ingredients
    const ingredients = [];
    if (ingredientMatches && ingredientMatches[1]) {
      const ingredientLines = ingredientMatches[1]
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-•*]\s*/, '').trim());
      
      for (const ing of ingredientLines) {
        if (ing) {
          const parts = ing.split(' ');
          let amount = "to taste";
          let name = ing;
          
          if (parts.length >= 3 && parts[0] && parts[1]) {
            amount = `${parts[0]} ${parts[1]}`;
            name = parts.slice(2).join(' ');
          } else if (parts.length === 2 && parts[0] && parts[1]) {
            amount = parts[0];
            name = parts[1];
          }
          
          // Choose appropriate emoji
          let icon = '🥘';
          if (name.toLowerCase().includes('tomato') || name.toLowerCase().includes('pepper')) icon = '🍅';
          else if (name.toLowerCase().includes('cheese') || name.toLowerCase().includes('milk')) icon = '🧀';
          else if (name.toLowerCase().includes('meat') || name.toLowerCase().includes('chicken')) icon = '🥩';
          else if (name.toLowerCase().includes('herb') || name.toLowerCase().includes('basil')) icon = '🌿';
          else if (name.toLowerCase().includes('oil') || name.toLowerCase().includes('butter')) icon = '🫒';
          else if (name.toLowerCase().includes('garlic') || name.toLowerCase().includes('onion')) icon = '🧄';
          else if (name.toLowerCase().includes('salt') || name.toLowerCase().includes('pepper')) icon = '🧂';
          else if (name.toLowerCase().includes('pasta') || name.toLowerCase().includes('noodle')) icon = '🍝';
          else if (name.toLowerCase().includes('rice') || name.toLowerCase().includes('grain')) icon = '🍚';
          else if (name.toLowerCase().includes('egg')) icon = '🥚';
          else if (name.toLowerCase().includes('flour') || name.toLowerCase().includes('bread')) icon = '🍞';
          else if (name.toLowerCase().includes('vegetable') || name.toLowerCase().includes('carrot')) icon = '🥕';
          
          ingredients.push({ icon, name, amount });
        }
      }
    }
    
    // Process instructions
    const instructions = [];
    if (instructionMatches && instructionMatches[1]) {
      const instructionLines = instructionMatches[1]
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^(?:\d+\.?|\d+\)|-|•|●|\*)\s*/, '').trim());
      
      instructions.push(...instructionLines.filter(line => line));
    }
    
    // Only create recipe if we have meaningful content
    if (ingredients.length === 0 && instructions.length === 0) {
      return null;
    }
    
    const recipe: Recipe = {
      title,
      skill_level: skillMatch && skillMatch[1] ? skillMatch[1].charAt(0).toUpperCase() + skillMatch[1].slice(1).toLowerCase() as Recipe['skill_level'] : "Beginner",
      special_preferences: [],
      cooking_time: timeMatch && timeMatch[1] ? timeMatch[1] : "15 min",
      ingredients,
      instructions
    };
    
    return recipe;
  } catch (error) {
    console.error("Error extracting recipe from message:", error);
    return null;
  }
}

// Main chat component with shared recipe state
function SharedStateChat({ agentId }: { agentId: string }) {
  const { state: agentState, setState: setAgentState } = useCoAgent<RecipeAgentState>({
    name: agentId,
    initialState: INITIAL_STATE
  });
  
  const [recipe, setRecipe] = useState(INITIAL_STATE.recipe);
  const { appendMessage, isLoading } = useCopilotChat();
  const { messages } = useCopilotMessagesContext();
  const [changedKeys, setChangedKeys] = useState<string[]>([]);
  const [lastProcessedMessageIndex, setLastProcessedMessageIndex] = useState(0);

  // Add action to handle state snapshot events from Python agent
  useCopilotAction({
    name: "state_snapshot",
    description: "Handle state snapshot events from the agent",
    parameters: [
      {
        name: "snapshot",
        type: "object",
        description: "The state snapshot containing recipe data"
      }
    ],
    handler: ({ snapshot }) => {
      console.log("Received state snapshot from agent:", snapshot);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snapshotObj = snapshot as any;
      if (snapshotObj?.recipe) {
        const newRecipe = snapshotObj.recipe as Recipe;
        setRecipe(newRecipe);
        setAgentState({ recipe: newRecipe });
        
        // Mark all fields as changed for animation
        setChangedKeys(Object.keys(newRecipe));
        setTimeout(() => setChangedKeys([]), 1000);
      }
      return { success: true };
    }
  });

  // Action to handle build_recipe calls from Python agent
  useCopilotAction({
    name: "build_recipe",
    description: "Display recipe data received from the agent",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Recipe title"
      },
      {
        name: "ingredients",
        type: "string[]",
        description: "Array of ingredient descriptions"
      },
      {
        name: "instructions",
        type: "string[]",
        description: "Array of cooking instructions"
      },
      {
        name: "skill_level",
        type: "string",
        description: "Skill level required"
      },
      {
        name: "cooking_time",
        type: "string",
        description: "Time to cook"
      },
      {
        name: "special_preferences",
        type: "string[]",
        description: "Any dietary preferences"
      }
    ],
    handler: ({ title, ingredients, instructions, skill_level, cooking_time, special_preferences }) => {
      console.log("Build recipe called with:", { title, ingredients, instructions, skill_level, cooking_time, special_preferences });
      
      // Convert the raw data to the recipe format expected by the UI
      const processedIngredients = (ingredients || []).map((ing: string) => {
        const parts = ing.split(' ');
        let amount = "to taste";
        let name = ing;
        
        if (parts.length >= 3) {
          amount = `${parts[0]} ${parts[1]}`;
          name = parts.slice(2).join(' ');
        } else if (parts.length === 2 && parts[0] && parts[1]) {
          amount = parts[0];
          name = parts[1];
        }
        
        // Choose appropriate emoji
        let icon = '🥘';
        if (name.toLowerCase().includes('tomato') || name.toLowerCase().includes('pepper')) icon = '🍅';
        else if (name.toLowerCase().includes('cheese') || name.toLowerCase().includes('milk')) icon = '🧀';
        else if (name.toLowerCase().includes('meat') || name.toLowerCase().includes('chicken')) icon = '🥩';
        else if (name.toLowerCase().includes('herb') || name.toLowerCase().includes('basil')) icon = '🌿';
        else if (name.toLowerCase().includes('oil') || name.toLowerCase().includes('butter')) icon = '🫒';
        else if (name.toLowerCase().includes('garlic') || name.toLowerCase().includes('onion')) icon = '🧄';
        else if (name.toLowerCase().includes('salt') || name.toLowerCase().includes('pepper')) icon = '🧂';
        else if (name.toLowerCase().includes('pasta') || name.toLowerCase().includes('noodle')) icon = '🍝';
        else if (name.toLowerCase().includes('rice') || name.toLowerCase().includes('grain')) icon = '🍚';
        else if (name.toLowerCase().includes('egg')) icon = '🥚';
        else if (name.toLowerCase().includes('flour') || name.toLowerCase().includes('bread')) icon = '🍞';
        else if (name.toLowerCase().includes('vegetable') || name.toLowerCase().includes('carrot')) icon = '🥕';
        
        return { icon, name, amount };
      });
      
      const recipeData: Recipe = {
        title: title || "New Recipe",
        skill_level: (skill_level || "Beginner") as Recipe['skill_level'],
        special_preferences: special_preferences || [],
        cooking_time: cooking_time || "15 min",
        ingredients: processedIngredients,
        instructions: instructions || []
      };
      
      // Update both agent state and local state
      setAgentState({ recipe: recipeData });
      setRecipe(recipeData);
      
      // Mark all fields as changed for animation
      setChangedKeys(Object.keys(recipeData));
      setTimeout(() => setChangedKeys([]), 1000);
      
      return { success: true, message: "Recipe displayed successfully" };
    }
  });

  // Action to get current recipe state
  useCopilotAction({
    name: "get_current_recipe",
    description: "Get the current recipe state",
    parameters: [],
    handler: () => {
      console.log("Agent requested current recipe:", recipe);
      return {
        recipe: recipe,
        isEmpty: recipe.ingredients.length === 0 && recipe.instructions.length === 0
      };
    }
  });

  // Sync agent state with local state
  useEffect(() => {
    if (agentState?.recipe) {
      console.log("SharedState agent state updated:", agentState);
      
      setRecipe(prevRecipe => {
        // Check if agent state differs from current state
        const currentRecipeStr = JSON.stringify(prevRecipe);
        const agentRecipeStr = JSON.stringify(agentState.recipe);
        
        if (currentRecipeStr !== agentRecipeStr) {
          const newRecipe = { ...agentState.recipe };
          const newChangedKeys: string[] = [];
          
          // Identify which keys changed
          for (const key in agentState.recipe) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const agentValue = (agentState.recipe as any)[key];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentValue = (prevRecipe as any)[key];
            
            if (JSON.stringify(agentValue) !== JSON.stringify(currentValue)) {
              newChangedKeys.push(key);
            }
          }
          
          if (newChangedKeys.length > 0) {
            setChangedKeys(newChangedKeys);
            // Clear changed keys after animation
            setTimeout(() => setChangedKeys([]), 1000);
          }
          
          return newRecipe;
        }
        
        return prevRecipe;
      });
    }
  }, [agentState]);

  const updateRecipe = (partialRecipe: Partial<Recipe>) => {
    const newRecipe = {
      ...recipe,
      ...partialRecipe
    };
    setRecipe(newRecipe);
    setAgentState({
      ...agentState,
      recipe: newRecipe
    });
  };

  // Process new messages from the agent to extract recipe information
  useEffect(() => {
    if (messages && messages.length > lastProcessedMessageIndex) {
      const newMessages = messages.slice(lastProcessedMessageIndex);
      
      for (const message of newMessages) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = message as any;
        if (msg.role === 'assistant' && msg.content) {
          // Try to extract recipe information from the message
          const recipeData = extractRecipeFromMessage(msg.content);
          if (recipeData) {
            console.log("Extracted recipe from message:", recipeData);
            setRecipe(recipeData);
            setAgentState({ recipe: recipeData });
            
            // Mark all fields as changed for animation
            setChangedKeys(Object.keys(recipeData));
            setTimeout(() => setChangedKeys([]), 1000);
          }
        }
      }
      
      setLastProcessedMessageIndex(messages.length);
    }
  }, [messages, lastProcessedMessageIndex, setAgentState]);

  // Add debugging for agent state changes
  useEffect(() => {
    console.log("SharedState agentState changed:", agentState);
  }, [agentState]);

  useEffect(() => {
    console.log("SharedState recipe state changed:", recipe);
  }, [recipe]);


  return (
    <div className="min-h-screen w-full flex bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4">
        <RecipeBuilder 
          recipe={recipe}
          updateRecipe={updateRecipe}
          changedKeys={changedKeys as string[]}
          isLoading={isLoading}
          appendMessage={appendMessage}
        />
      </div>
      <CopilotSidebar
        defaultOpen={true}
        labels={{
          title: "AI Recipe Assistant",
          initial: "Hi 👋 How can I help with your recipe?"
        }}
        clickOutsideToClose={false}
      />
    </div>
  );
}

export default function SharedStateAgent({ agentId }: SharedStateAgentProps) {
  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      agent={agentId}
    >
      <SharedStateChat agentId={agentId} />
    </CopilotKit>
  );
}