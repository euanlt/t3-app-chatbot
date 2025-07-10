"use client";

import { useState } from "react";
import { FaCode, FaGlobe, FaDatabase, FaTerminal } from "react-icons/fa";
import { api } from "~/trpc/react";

interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  requirements?: string;
}

const templates: ServerTemplate[] = [
  {
    id: "tavily",
    name: "Tavily Web Search",
    description: "Search the web using Tavily AI-powered search",
    icon: <FaGlobe className="text-blue-500" />,
    transport: "stdio",
    command: "npx",
    args: ["-y", "tavily-mcp"],
    env: {
      TAVILY_API_KEY: "your-tavily-api-key",
    },
    requirements: "Node.js, Tavily API key",
  },
  {
    id: "test-env",
    name: "Test Environment Variables",
    description: "Test if environment variables are passed correctly",
    icon: <FaTerminal className="text-yellow-500" />,
    transport: "stdio",
    command: "sh",
    args: ["-c", 'echo "TAVILY_API_KEY=$TAVILY_API_KEY"'],
    env: {
      TAVILY_API_KEY: "test-value-123",
    },
    requirements: "Shell",
  },
  {
    id: "filesystem",
    name: "File System Access",
    description: "Read and write files on your local computer",
    icon: <FaCode className="text-blue-500" />,
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/Users"],
    requirements: "Node.js",
  },
  {
    id: "git",
    name: "Git Repository",
    description: "Access git repositories and perform git operations",
    icon: <FaTerminal className="text-orange-500" />,
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-git", "--repository", "."],
    requirements: "Node.js, Git",
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Search the web using Brave Search API",
    icon: <FaGlobe className="text-green-500" />,
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: {
      BRAVE_API_KEY: "your-brave-api-key",
    },
    requirements: "Node.js, Brave Search API key",
  },
  {
    id: "sqlite",
    name: "SQLite Database",
    description: "Query and manage SQLite databases",
    icon: <FaDatabase className="text-purple-500" />,
    transport: "stdio",
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-sqlite",
      "--db-path",
      "./database.sqlite",
    ],
    requirements: "Node.js, SQLite file",
  },
  {
    id: "example-http",
    name: "Example HTTP Server",
    description: "Connect to a remote MCP server via HTTP",
    icon: <FaGlobe className="text-indigo-500" />,
    transport: "http" as const,
    url: "https://your-mcp-server.example.com/api/mcp",
    requirements: "HTTP endpoint with MCP protocol support",
  },
];

interface ServerTemplatesProps {
  onTemplateSelect: (template: ServerTemplate) => void;
}

export default function ServerTemplates({
  onTemplateSelect,
}: ServerTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const addServer = api.mcp.addServer.useMutation({
    onSuccess: () => {
      setSelectedTemplate(null);
    },
    onError: (error) => {
      alert(`Failed to add server: ${error.message}`);
    },
  });

  const handleQuickAdd = (template: ServerTemplate) => {
    setSelectedTemplate(template.id);

    // For templates that need API keys, show a prompt
    if (template.env && Object.keys(template.env).length > 0) {
      const envVars: Record<string, string> = {};
      let shouldContinue = true;

      for (const [key, defaultValue] of Object.entries(template.env)) {
        if (
          defaultValue.includes("your-") ||
          defaultValue.includes("api-key")
        ) {
          const value = prompt(`Enter your ${key}:`);
          if (!value) {
            shouldContinue = false;
            break;
          }
          envVars[key] = value;
        } else {
          envVars[key] = defaultValue;
        }
      }

      if (!shouldContinue) {
        setSelectedTemplate(null);
        return;
      }

      template.env = envVars;
    }

    // For HTTP templates that need URL customization
    if (template.transport === "http" && template.url) {
      if (
        template.url.includes("example.com") ||
        template.url.includes("your-")
      ) {
        const customUrl = prompt("Enter the MCP server URL:", template.url);
        if (!customUrl) {
          setSelectedTemplate(null);
          return;
        }
        template.url = customUrl;
      }
    }

    addServer.mutate({
      name: template.name,
      description: template.description,
      transport: template.transport,
      command: template.command,
      args: template.args,
      env: template.env,
      url: template.url,
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-primary mb-3 text-sm font-medium">
        Quick Start Templates
      </h4>

      <div className="grid grid-cols-1 gap-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="border-primary hover:border-hover bg-primary cursor-pointer rounded-lg border p-3 transition-colors"
            onClick={() => onTemplateSelect(template)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 flex-shrink-0">{template.icon}</div>
              <div className="flex-1">
                <div className="text-primary text-sm font-medium">
                  {template.name}
                </div>
                <div className="text-secondary mt-1 text-xs">
                  {template.description}
                </div>
                {template.requirements && (
                  <div className="text-tertiary mt-1 text-xs">
                    Requires: {template.requirements}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickAdd(template);
                }}
                disabled={
                  addServer.isPending && selectedTemplate === template.id
                }
                className="bg-button text-button hover:bg-button-hover rounded px-2 py-1 text-xs transition-colors disabled:opacity-50"
              >
                {addServer.isPending && selectedTemplate === template.id
                  ? "Adding..."
                  : "Quick Add"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-secondary text-xs">
        <p>
          💡 <strong>Tip:</strong> These templates provide pre-configured MCP
          servers. You can customize them after adding.
        </p>
      </div>
    </div>
  );
}
