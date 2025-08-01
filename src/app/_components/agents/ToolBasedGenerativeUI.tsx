"use client";

import { useState } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useCopilotAction } from "@copilotkit/react-core";

interface HaikuContent {
  title: string;
  lines: string[];
  theme: string;
}

interface RecipeContent {
  name: string;
  ingredients: string[];
  steps: string[];
  prep_time: string;
  servings: number;
}

interface CodeSnippet {
  language: string;
  code: string;
  explanation: string;
  title: string;
}

interface ToolBasedGenerativeUIProps {
  agentId: string;
  agentName: string;
}

// Component for displaying generated haiku
function HaikuDisplay({ haiku, onApply }: { haiku: HaikuContent; onApply: () => void }) {
  // Handle case where haiku data might be undefined or incomplete
  if (!haiku || !haiku.title) {
    return (
      <div className="bg-red-50 p-6 rounded-lg shadow-md border border-red-200 m-4">
        <h3 className="text-xl font-semibold text-red-800 mb-3">Error Loading Haiku</h3>
        <p className="text-red-600">Haiku data is incomplete or missing.</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-red-500">Debug Info</summary>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
            {JSON.stringify(haiku, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  // Ensure lines is an array
  let lines: string[] = [];
  if (Array.isArray(haiku.lines)) {
    lines = haiku.lines;
  } else if (typeof haiku.lines === 'string') {
    lines = [haiku.lines];
  } else if (haiku.lines) {
    lines = [String(haiku.lines)];
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg shadow-md border border-blue-200 m-4">
      <h3 className="text-xl font-semibold text-indigo-800 mb-3">{haiku.title}</h3>
      <div className="space-y-2 mb-4">
        {lines.length > 0 ? (
          lines.map((line, index) => (
            <p key={index} className="text-gray-700 italic text-center text-lg">
              {line}
            </p>
          ))
        ) : (
          <p className="text-gray-500 italic text-center">No haiku lines available</p>
        )}
      </div>
      <div className="text-xs text-gray-400 mb-2">
        Debug: lines type = {typeof haiku.lines}, isArray = {Array.isArray(haiku.lines)}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
          Theme: {haiku.theme || 'Unknown'}
        </span>
        <button
          onClick={onApply}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-medium transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// Component for displaying generated recipe
function RecipeDisplay({ recipe, onApply }: { recipe: RecipeContent; onApply: () => void }) {
  // Handle case where recipe data might be undefined or incomplete
  if (!recipe || !recipe.name) {
    return (
      <div className="bg-red-50 p-6 rounded-lg shadow-md border border-red-200 m-4">
        <h3 className="text-xl font-semibold text-red-800 mb-3">Error Loading Recipe</h3>
        <p className="text-red-600">Recipe data is incomplete or missing.</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-red-500">Debug Info</summary>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
            {JSON.stringify(recipe, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  // Ensure ingredients and steps are arrays
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-lg shadow-md border border-green-200 m-4">
      <h3 className="text-xl font-semibold text-emerald-800 mb-3">{recipe.name}</h3>
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-semibold text-emerald-700 mb-2">Ingredients:</h4>
          <ul className="list-disc list-inside space-y-1">
            {ingredients.length > 0 ? (
              ingredients.map((ingredient, index) => (
                <li key={index} className="text-gray-700">{ingredient}</li>
              ))
            ) : (
              <li className="text-gray-500">No ingredients listed</li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-emerald-700 mb-2">Steps:</h4>
          <ol className="list-decimal list-inside space-y-1">
            {steps.length > 0 ? (
              steps.map((step, index) => (
                <li key={index} className="text-gray-700">{step}</li>
              ))
            ) : (
              <li className="text-gray-500">No steps provided</li>
            )}
          </ol>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div className="text-sm text-emerald-600">
          <span className="bg-emerald-100 px-2 py-1 rounded mr-2">
            Prep: {recipe.prep_time}
          </span>
          <span className="bg-emerald-100 px-2 py-1 rounded">
            Serves: {recipe.servings}
          </span>
        </div>
        <button
          onClick={onApply}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-medium transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// Component for displaying code snippet
function CodeDisplay({ code, onApply }: { code: CodeSnippet; onApply: () => void }) {
  // Handle case where code data might be undefined or incomplete
  if (!code || !code.title || !code.code) {
    return (
      <div className="bg-red-50 p-6 rounded-lg shadow-md border border-red-200 m-4">
        <h3 className="text-xl font-semibold text-red-800 mb-3">Error Loading Code</h3>
        <p className="text-red-600">Code data is incomplete or missing.</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-red-500">Debug Info</summary>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
            {JSON.stringify(code, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-100 p-6 rounded-lg shadow-md border border-gray-200 m-4">
      <h3 className="text-xl font-semibold text-slate-800 mb-3">{code.title}</h3>
      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4 overflow-x-auto">
        <pre>{code.code}</pre>
      </div>
      <p className="text-gray-700 mb-4">{code.explanation}</p>
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
          Language: {code.language}
        </span>
        <button
          onClick={onApply}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-medium transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// Main chat component with content generation actions
function GenerativeChat({ agentName }: { agentId: string; agentName: string }) {
  const [background, setBackground] = useState<string>("--copilot-kit-background-color");
  const [generatedContent, setGeneratedContent] = useState<Array<{ id: number; type: "haiku" | "recipe" | "code"; content: HaikuContent | RecipeContent | CodeSnippet }>>([]);

  // Background color action
  useCopilotAction({
    name: "change_background",
    description: "Change the background color of the chat. Can be anything that the CSS background attribute accepts.",
    parameters: [
      {
        name: "background",
        type: "string",
        description: "The background. Prefer gradients."
      }
    ],
    handler: ({ background }) => {
      setBackground(background);
      return {
        status: "success",
        message: `Background changed to ${background}`,
      };
    }
  });

  // UI-only action for displaying haiku results
  useCopilotAction({
    name: "ui_display_haiku",
    description: "Display a generated haiku in the UI",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Title of the haiku"
      },
      {
        name: "lines",
        type: "array",
        description: "Array of haiku lines"
      },
      {
        name: "theme",
        type: "string",
        description: "Theme of the haiku"
      }
    ],
    handler: ({ title, lines, theme }) => {
      console.log('UI display haiku called:', { title, lines, theme });
      
      const haikuData: HaikuContent = {
        title: title || 'Untitled Haiku',
        lines: lines || [],
        theme: theme || 'unknown'
      };
      
      const newContent = {
        id: Date.now(),
        type: "haiku" as const,
        content: haikuData
      };
      
      setGeneratedContent(prev => [...prev, newContent]);
      
      return {
        status: "success",
        message: "Haiku displayed in UI"
      };
    }
  });

  // UI-only action for displaying recipe results
  useCopilotAction({
    name: "ui_display_recipe",
    description: "Display a generated recipe in the UI",
    parameters: [
      {
        name: "name",
        type: "string",
        description: "Recipe name"
      },
      {
        name: "ingredients",
        type: "array",
        description: "Array of ingredients"
      },
      {
        name: "steps",
        type: "array",
        description: "Array of cooking steps"
      },
      {
        name: "prep_time",
        type: "string",
        description: "Preparation time"
      },
      {
        name: "servings",
        type: "number",
        description: "Number of servings"
      }
    ],
    handler: ({ name, ingredients, steps, prep_time, servings }) => {
      console.log('UI display recipe called:', { name, ingredients, steps, prep_time, servings });
      
      const recipeData: RecipeContent = {
        name: name || 'Untitled Recipe',
        ingredients: ingredients || [],
        steps: steps || [],
        prep_time: prep_time || 'Unknown',
        servings: servings || 1
      };
      
      const newContent = {
        id: Date.now(),
        type: "recipe" as const,
        content: recipeData
      };
      
      setGeneratedContent(prev => [...prev, newContent]);
      
      return {
        status: "success",
        message: "Recipe displayed in UI"
      };
    }
  });

  // UI-only action for displaying code snippet results
  useCopilotAction({
    name: "ui_display_code_snippet",
    description: "Display a generated code snippet in the UI",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Code snippet title"
      },
      {
        name: "language",
        type: "string",
        description: "Programming language"
      },
      {
        name: "code",
        type: "string",
        description: "The code"
      },
      {
        name: "explanation",
        type: "string",
        description: "Explanation of the code"
      }
    ],
    handler: ({ title, language, code, explanation }) => {
      console.log('UI display code snippet called:', { title, language, code, explanation });
      
      const codeData: CodeSnippet = {
        title: title || 'Untitled Code',
        language: language || 'text',
        code: code || '',
        explanation: explanation || 'No explanation provided'
      };
      
      const newContent = {
        id: Date.now(),
        type: "code" as const,
        content: codeData
      };
      
      setGeneratedContent(prev => [...prev, newContent]);
      
      return {
        status: "success",
        message: "Code snippet displayed in UI"
      };
    }
  });

  const handleApply = (id: number) => {
    setGeneratedContent(prev => prev.filter(item => item.id !== id));
    // Here you could add logic to actually "apply" the content somewhere
  };

  return (
    <div className="flex justify-center items-center h-full w-full" style={{ background }}>
      <div className="w-4/5 h-4/5 rounded-lg flex">
        {/* Chat area */}
        <div className="flex-1">
          <CopilotChat
            className="h-full rounded-2xl"
            labels={{
              title: agentName,
              initial: `Hello! I'm ${agentName}. I can generate haikus, recipes, and code snippets. Try asking me to "create a haiku about nature" or "generate a pasta recipe"!`
            }}
          />
        </div>
        
        {/* Generated content preview area */}
        {generatedContent.length > 0 && (
          <div className="w-1/3 ml-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Generated Content</h3>
            {generatedContent.map(item => (
              <div key={item.id}>
                {item.type === "haiku" && (
                  <HaikuDisplay 
                    haiku={item.content} 
                    onApply={() => handleApply(item.id)} 
                  />
                )}
                {item.type === "recipe" && (
                  <RecipeDisplay 
                    recipe={item.content} 
                    onApply={() => handleApply(item.id)} 
                  />
                )}
                {item.type === "code" && (
                  <CodeDisplay 
                    code={item.content} 
                    onApply={() => handleApply(item.id)} 
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ToolBasedGenerativeUI({ agentId, agentName }: ToolBasedGenerativeUIProps) {
  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      agent={agentId}
    >
      <GenerativeChat agentId={agentId} agentName={agentName} />
    </CopilotKit>
  );
}