"use client";

import { useState } from 'react';
import { FaCode, FaGlobe, FaDatabase, FaTerminal } from 'react-icons/fa';
import { api } from "~/trpc/react";

interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  transport: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  requirements?: string;
}

const templates: ServerTemplate[] = [
  {
    id: 'tavily',
    name: 'Tavily Web Search',
    description: 'Search the web using Tavily AI-powered search',
    icon: <FaGlobe className="text-blue-500" />,
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'tavily-mcp'],
    env: {
      'TAVILY_API_KEY': 'your-tavily-api-key'
    },
    requirements: 'Node.js, Tavily API key'
  },
  {
    id: 'test-env',
    name: 'Test Environment Variables',
    description: 'Test if environment variables are passed correctly',
    icon: <FaTerminal className="text-yellow-500" />,
    transport: 'stdio',
    command: 'sh',
    args: ['-c', 'echo "TAVILY_API_KEY=$TAVILY_API_KEY"'],
    env: {
      'TAVILY_API_KEY': 'test-value-123'
    },
    requirements: 'Shell'
  },
  {
    id: 'filesystem',
    name: 'File System Access',
    description: 'Read and write files on your local computer',
    icon: <FaCode className="text-blue-500" />,
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users'],
    requirements: 'Node.js'
  },
  {
    id: 'git',
    name: 'Git Repository',
    description: 'Access git repositories and perform git operations',
    icon: <FaTerminal className="text-orange-500" />,
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git', '--repository', '.'],
    requirements: 'Node.js, Git'
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Search the web using Brave Search API',
    icon: <FaGlobe className="text-green-500" />,
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: {
      'BRAVE_API_KEY': 'your-brave-api-key'
    },
    requirements: 'Node.js, Brave Search API key'
  },
  {
    id: 'sqlite',
    name: 'SQLite Database',
    description: 'Query and manage SQLite databases',
    icon: <FaDatabase className="text-purple-500" />,
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', './database.sqlite'],
    requirements: 'Node.js, SQLite file'
  }
];

interface ServerTemplatesProps {
  onTemplateSelect: (template: ServerTemplate) => void;
}

export default function ServerTemplates({ onTemplateSelect }: ServerTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const addServer = api.mcp.addServer.useMutation({
    onSuccess: () => {
      setSelectedTemplate(null);
    },
    onError: (error) => {
      alert(`Failed to add server: ${error.message}`);
    }
  });

  const handleQuickAdd = (template: ServerTemplate) => {
    setSelectedTemplate(template.id);
    
    // For templates that need API keys, show a prompt
    if (template.env && Object.keys(template.env).length > 0) {
      const envVars: Record<string, string> = {};
      let shouldContinue = true;
      
      for (const [key, defaultValue] of Object.entries(template.env)) {
        if (defaultValue.includes('your-') || defaultValue.includes('api-key')) {
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
    
    addServer.mutate({
      name: template.name,
      description: template.description,
      transport: template.transport,
      command: template.command,
      args: template.args,
      env: template.env,
      url: template.url
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-primary mb-3">Quick Start Templates</h4>
      
      <div className="grid grid-cols-1 gap-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="p-3 border border-primary rounded-lg hover:border-hover transition-colors cursor-pointer bg-primary"
            onClick={() => onTemplateSelect(template)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {template.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-primary">{template.name}</div>
                <div className="text-xs text-secondary mt-1">{template.description}</div>
                {template.requirements && (
                  <div className="text-xs text-tertiary mt-1">
                    Requires: {template.requirements}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickAdd(template);
                }}
                disabled={addServer.isPending && selectedTemplate === template.id}
                className="text-xs px-2 py-1 bg-button text-button rounded hover:bg-button-hover transition-colors disabled:opacity-50"
              >
                {addServer.isPending && selectedTemplate === template.id ? 'Adding...' : 'Quick Add'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-secondary">
        <p>💡 <strong>Tip:</strong> These templates provide pre-configured MCP servers. You can customize them after adding.</p>
      </div>
    </div>
  );
}