"use client";

import { useState, useEffect } from "react";
import { CopilotKit, useCoAgent, useCopilotChat } from "@copilotkit/react-core";
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
  changedKeys,
  isLoading,
  appendMessage
}: { 
  recipe: Recipe;
  updateRecipe: (partialRecipe: Partial<Recipe>) => void;
  changedKeys: string[];
  isLoading: boolean;
  appendMessage: (message: TextMessage) => void;
}) {
  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-green-100 text-green-800";
      case "Intermediate": return "bg-yellow-100 text-yellow-800";
      case "Advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

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
function Ping() {
  return (
    <span className="absolute -top-1 -right-1 flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
    </span>
  );
}

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

// Main chat component with shared recipe state
function SharedStateChat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const { state: agentState, setState: setAgentState } = useCoAgent<RecipeAgentState>({
    name: agentId,
    initialState: INITIAL_STATE
  });
  
  const [recipe, setRecipe] = useState(INITIAL_STATE.recipe);
  const { appendMessage, isLoading } = useCopilotChat();
  const [changedKeys, setChangedKeys] = useState<string[]>([]);

  // Sync agent state with local state
  useEffect(() => {
    if (agentState && agentState.recipe) {
      const newRecipe = { ...recipe };
      const newChangedKeys: string[] = [];
      
      for (const key in recipe) {
        const agentValue = (agentState.recipe as any)[key];
        const recipeValue = (recipe as any)[key];
        
        if (agentValue !== undefined && agentValue !== null && 
            JSON.stringify(agentValue) !== JSON.stringify(recipeValue)) {
          (newRecipe as any)[key] = agentValue;
          newChangedKeys.push(key);
        }
      }
      
      if (newChangedKeys.length > 0) {
        setRecipe(newRecipe);
        setChangedKeys(newChangedKeys);
        // Clear changed keys after animation
        setTimeout(() => setChangedKeys([]), 1000);
      }
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


  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <RecipeBuilder 
        recipe={recipe}
        updateRecipe={updateRecipe}
        changedKeys={changedKeys}
        isLoading={isLoading}
        appendMessage={appendMessage}
      />
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

export default function SharedStateAgent({ agentId, agentName }: SharedStateAgentProps) {
  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      agent={agentId}
    >
      <SharedStateChat agentId={agentId} agentName={agentName} />
    </CopilotKit>
  );
}