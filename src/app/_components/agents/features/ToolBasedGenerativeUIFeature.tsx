"use client";

import React, { useState } from "react";
import { CopilotChat, useCopilotAction } from "@copilotkit/react-ui";
import { FaCheck, FaTimes, FaSpinner } from "react-icons/fa";
import type { HaikuArgs } from "~/lib/agents/types";

export default function ToolBasedGenerativeUIFeature() {
  const [haiku, setHaiku] = useState({
    japanese: ["仮の句よ", "まっさらながら", "花を呼ぶ"],
    english: ["A placeholder verse—", "even in a blank canvas,", "it beckons flowers."],
  });

  // Tool for generating haikus with custom rendering
  useCopilotAction({
    name: "generate_haiku",
    description: "Generate a beautiful haiku in both Japanese and English about any topic",
    parameters: [
      {
        name: "japanese",
        type: "string[]",
        description: "Three lines of the haiku in Japanese",
      },
      {
        name: "english",
        type: "string[]",
        description: "Three lines of the haiku in English translation",
      },
      {
        name: "topic",
        type: "string",
        description: "The topic or theme of the haiku",
      },
    ],
    followUp: false,
    handler: async () => {
      return "Haiku generated successfully.";
    },
    render: ({ args: generatedHaiku, result, status }) => {
      return (
        <HaikuApproval 
          setHaiku={setHaiku} 
          generatedHaiku={generatedHaiku} 
          status={status} 
        />
      );
    },
  });

  return (
    <div className="h-full p-4">
      <div className="h-full max-w-4xl mx-auto flex flex-col">
        {/* Current Haiku Display */}
        <div className="mb-6 p-6 bg-secondary rounded-lg shadow-lg">
          <h2 className="text-primary text-xl font-semibold mb-4 text-center">Current Haiku</h2>
          <div className="text-center max-w-md mx-auto">
            {haiku?.japanese.map((line, index) => (
              <div className="flex items-center justify-center gap-6 mb-3" key={index}>
                <p className="text-2xl font-bold text-primary font-mono">{line}</p>
                <p className="text-base font-light text-secondary italic">
                  {haiku?.english?.[index]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1">
          <CopilotChat
            className="h-full rounded-2xl shadow-lg"
            labels={{
              initial: "Welcome! I can generate beautiful haikus in both Japanese and English. What would you like a haiku about?",
              placeholder: "Try: 'Generate a haiku about cherry blossoms' or 'Create a haiku about coding'",
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface HaikuApprovalProps {
  setHaiku: (haiku: { japanese: string[]; english: string[] }) => void;
  generatedHaiku: HaikuArgs;
  status: string;
}

function HaikuApproval({ setHaiku, generatedHaiku, status }: HaikuApprovalProps) {
  if (status === "loading") {
    return (
      <div className="bg-secondary rounded-lg p-4 my-2 max-w-md mx-auto">
        <div className="flex items-center gap-2 text-primary">
          <FaSpinner className="animate-spin" />
          <span>Crafting your haiku...</span>
        </div>
      </div>
    );
  }

  if (!generatedHaiku?.japanese || !generatedHaiku?.english) {
    return null;
  }

  const handleApprove = () => {
    setHaiku({
      japanese: generatedHaiku.japanese,
      english: generatedHaiku.english,
    });
  };

  return (
    <div className="bg-secondary rounded-lg p-4 my-2 max-w-md mx-auto shadow-lg">
      <h3 className="text-primary text-lg font-semibold mb-3 text-center">New Haiku Generated</h3>
      
      {/* Preview of the generated haiku */}
      <div className="mb-4 p-3 bg-tertiary rounded text-center">
        {generatedHaiku.japanese.map((line, index) => (
          <div className="flex items-center justify-center gap-4 mb-2" key={index}>
            <span className="text-lg font-bold text-primary font-mono">{line}</span>
            <span className="text-sm font-light text-secondary italic">
              {generatedHaiku.english?.[index]}
            </span>
          </div>
        ))}
      </div>

      {/* Approval buttons */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => {/* Do nothing - keep current haiku */}}
          className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
        >
          <FaTimes size={12} />
          Keep Current
        </button>
        <button
          onClick={handleApprove}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
        >
          <FaCheck size={12} />
          Use This Haiku
        </button>
      </div>
    </div>
  );
}