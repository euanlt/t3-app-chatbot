"use client";

import React, { useState } from "react";
import { CopilotChat, useCopilotAction } from "@copilotkit/react-ui";

export default function AgenticChatFeature() {
  const [background, setBackground] = useState<string>("var(--bg-chat)");

  // Tool for changing background color (client-side tool)
  useCopilotAction({
    name: "change_background",
    description: "Change the background color of the chat interface. Users can request specific colors or gradients.",
    parameters: [
      {
        name: "background",
        type: "string",
        description: "The background color or CSS gradient. Prefer gradients for better visual appeal.",
      },
    ],
    handler: ({ background }) => {
      setBackground(background);
      return {
        status: "success",
        message: `Background changed to ${background}`,
      };
    },
  });

  return (
    <div 
      className="flex justify-center items-center h-full w-full transition-all duration-500" 
      style={{ background }}
    >
      <div className="w-4/5 h-4/5 max-w-4xl">
        <CopilotChat
          className="h-full rounded-2xl shadow-lg"
          labels={{
            initial: "Hi, I'm an agentic chat agent! I can check time in different time zones and change the background. What would you like to try?",
            placeholder: "Try: 'What time is it in Tokyo?' or 'Change background to a sunset gradient'",
          }}
        />
      </div>
    </div>
  );
}