"use client";

import React, { useState, useEffect, useRef } from "react";
import { CopilotChat, useCopilotAction, useCoAgent } from "@copilotkit/react-ui";
import { FaPlus, FaTimes, FaEdit } from "react-icons/fa";
import type { RecipeAgentState } from "~/lib/agents/types";

const INITIAL_STATE: RecipeAgentState = {
  recipe: {
    title: "Chocolate Chip Cookies",
    description: "Classic homemade chocolate chip cookies that are crispy on the outside and chewy on the inside.",
    ingredients: [
      { id: "1", name: "All-purpose flour", amount: "2 1/4 cups" },
      { id: "2", name: "Baking soda", amount: "1 tsp" },
      { id: "3", name: "Salt", amount: "1/2 tsp" },
      { id: "4", name: "Butter", amount: "1 cup (softened)" },
      { id: "5", name: "Brown sugar", amount: "3/4 cup" },
      { id: "6", name: "White sugar", amount: "1/2 cup" },
      { id: "7", name: "Eggs", amount: "2 large" },
      { id: "8", name: "Vanilla extract", amount: "2 tsp" },
      { id: "9", name: "Chocolate chips", amount: "2 cups" },
    ],
    instructions: [
      { id: "1", step: "Preheat oven to 375°F (190°C)" },
      { id: "2", step: "Mix flour, baking soda, and salt in a bowl" },
      { id: "3", step: "Cream butter and sugars until fluffy" },
      { id: "4", step: "Beat in eggs and vanilla" },
      { id: "5", step: "Gradually blend in flour mixture" },
      { id: "6", step: "Stir in chocolate chips" },
      { id: "7", step: "Drop rounded tablespoons onto baking sheet" },
      { id: "8", step: "Bake 9-11 minutes until golden brown" },
    ],
  },
};

export default function SharedStateFeature() {
  const { state: agentState, setState: setAgentState } = useCoAgent<RecipeAgentState>({
    name: "shared_state",
    initialState: INITIAL_STATE,
  });

  const [recipe, setRecipe] = useState(INITIAL_STATE.recipe);
  const [changedKeys, setChangedKeys] = useState<string[]>([]);
  const changedKeysRef = useRef<string[]>([]);

  // Sync state changes from agent
  useEffect(() => {
    if (!agentState?.recipe) return;

    const newRecipeState = { ...recipe };
    const newChangedKeys: string[] = [];

    for (const key in recipe) {
      if (agentState.recipe[key as keyof typeof agentState.recipe] !== undefined) {
        let agentValue = agentState.recipe[key as keyof typeof agentState.recipe];
        const recipeValue = recipe[key as keyof typeof recipe];

        if (typeof agentValue === "string") {
          agentValue = (agentValue as string).replace(/\\n/g, "\n");
        }

        if (JSON.stringify(agentValue) !== JSON.stringify(recipeValue)) {
          (newRecipeState as any)[key] = agentValue;
          newChangedKeys.push(key);
        }
      }
    }

    if (newChangedKeys.length > 0) {
      setRecipe(newRecipeState);
      setChangedKeys(newChangedKeys);
      changedKeysRef.current = newChangedKeys;

      // Clear change indicators after 3 seconds
      setTimeout(() => {
        setChangedKeys([]);
        changedKeysRef.current = [];
      }, 3000);
    }
  }, [agentState, recipe]);

  // Tool for displaying recipe updates
  useCopilotAction({
    name: "display_recipe",
    description: "Display and update the shared recipe with new ingredients, instructions, or modifications",
    parameters: [
      {
        name: "recipe",
        type: "object",
        attributes: [
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "ingredients", type: "object[]" },
          { name: "instructions", type: "object[]" },
        ],
      },
    ],
    handler: ({ recipe: updatedRecipe }) => {
      setAgentState({ recipe: updatedRecipe });
      return {
        status: "success",
        message: "Recipe updated successfully",
      };
    },
  });

  const updateRecipe = (partialRecipe: Partial<typeof recipe>) => {
    const updated = { ...recipe, ...partialRecipe };
    setRecipe(updated);
    setAgentState({ recipe: updated });
  };

  const addIngredient = () => {
    const newIngredient = {
      id: Date.now().toString(),
      name: "New ingredient",
      amount: "1 cup",
    };
    updateRecipe({
      ingredients: [...recipe.ingredients, newIngredient],
    });
  };

  const removeIngredient = (id: string) => {
    updateRecipe({
      ingredients: recipe.ingredients.filter((ing) => ing.id !== id),
    });
  };

  const addInstruction = () => {
    const newInstruction = {
      id: Date.now().toString(),
      step: "New step",
    };
    updateRecipe({
      instructions: [...recipe.instructions, newInstruction],
    });
  };

  const removeInstruction = (id: string) => {
    updateRecipe({
      instructions: recipe.instructions.filter((inst) => inst.id !== id),
    });
  };

  return (
    <div className="h-full p-4 flex gap-4">
      {/* Recipe Editor */}
      <div className="flex-1 max-w-2xl overflow-y-auto">
        <div className="bg-secondary rounded-lg shadow-lg p-6">
          {/* Recipe Header */}
          <div className="mb-6">
            <div className="relative">
              {changedKeys.includes("title") && <ChangeIndicator />}
              <input
                value={recipe.title}
                onChange={(e) => updateRecipe({ title: e.target.value })}
                className="text-2xl font-bold text-primary bg-transparent border-none outline-none w-full mb-2"
              />
            </div>
            <div className="relative">
              {changedKeys.includes("description") && <ChangeIndicator />}
              <textarea
                value={recipe.description}
                onChange={(e) => updateRecipe({ description: e.target.value })}
                className="text-secondary bg-transparent border-none outline-none w-full resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-primary">Ingredients</h3>
              <button
                onClick={addIngredient}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                <FaPlus size={12} />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <div key={ingredient.id} className="flex items-center gap-2 group">
                  <span className="text-secondary w-8 text-sm">{index + 1}.</span>
                  <input
                    value={ingredient.amount}
                    onChange={(e) => {
                      const updated = [...recipe.ingredients];
                      updated[index] = { ...ingredient, amount: e.target.value };
                      updateRecipe({ ingredients: updated });
                    }}
                    className="bg-input border-input text-primary rounded px-2 py-1 text-sm w-24"
                  />
                  <input
                    value={ingredient.name}
                    onChange={(e) => {
                      const updated = [...recipe.ingredients];
                      updated[index] = { ...ingredient, name: e.target.value };
                      updateRecipe({ ingredients: updated });
                    }}
                    className="bg-input border-input text-primary rounded px-2 py-1 text-sm flex-1"
                  />
                  <button
                    onClick={() => removeIngredient(ingredient.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-all"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-primary">Instructions</h3>
              <button
                onClick={addInstruction}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                <FaPlus size={12} />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {recipe.instructions.map((instruction, index) => (
                <div key={instruction.id} className="flex items-start gap-2 group">
                  <span className="text-secondary w-8 text-sm mt-2">{index + 1}.</span>
                  <textarea
                    value={instruction.step}
                    onChange={(e) => {
                      const updated = [...recipe.instructions];
                      updated[index] = { ...instruction, step: e.target.value };
                      updateRecipe({ instructions: updated });
                    }}
                    className="bg-input border-input text-primary rounded px-2 py-1 text-sm flex-1 resize-none"
                    rows={2}
                  />
                  <button
                    onClick={() => removeInstruction(instruction.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-all mt-1"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="w-96">
        <CopilotChat
          className="h-full rounded-2xl shadow-lg"
          labels={{
            initial: "I can help you create and modify recipes! The recipe on the left will update in real-time as we collaborate. What would you like to work on?",
            placeholder: "Try: 'Make this recipe healthier' or 'Add chocolate to this recipe'",
          }}
        />
      </div>
    </div>
  );
}

function ChangeIndicator() {
  return (
    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse">
      <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75" />
    </div>
  );
}