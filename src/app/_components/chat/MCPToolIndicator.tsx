"use client";

import { useState, useEffect } from "react";
import { FaCog } from "react-icons/fa";
import { api } from "~/trpc/react";

interface MCPToolIndicatorProps {
  message: string;
  onToolsDetected?: (tools: Array<{ tool: string; server: string }>) => void;
}

export default function MCPToolIndicator({
  message,
  onToolsDetected,
}: MCPToolIndicatorProps) {
  const [showTools, setShowTools] = useState(false);

  // Get available tools (commented out as not currently used)
  // const { data: availableTools } = api.mcp.getAvailableTools.useQuery();

  // Search for relevant tools based on message
  const { data: searchResults } = api.mcp.searchTools.useQuery(
    { query: message },
    {
      enabled: message.length > 3,
      staleTime: 30000, // Cache for 30 seconds
    },
  );

  useEffect(() => {
    if (searchResults && searchResults.length > 0 && onToolsDetected) {
      const tools = searchResults.map((result) => ({
        tool: result.tool.name,
        server: result.serverName,
      }));
      onToolsDetected(tools);
    }
  }, [searchResults, onToolsDetected]);

  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  return (
    <div className="mb-2">
      <button
        onClick={() => setShowTools(!showTools)}
        className="text-tertiary hover:text-secondary flex items-center gap-1 text-xs transition-colors"
      >
        <FaCog className={`h-3 w-3 ${showTools ? "animate-spin" : ""}`} />
        {searchResults.length} MCP tool{searchResults.length !== 1 ? "s" : ""}{" "}
        available
      </button>

      {showTools && (
        <div className="mt-2 space-y-1 text-xs">
          {searchResults.map((result, idx) => (
            <div key={idx} className="text-tertiary flex items-center gap-2">
              <span className="font-medium">{result.serverName}:</span>
              <span>{result.tool.name}</span>
              {result.tool.description && (
                <span className="text-muted">- {result.tool.description}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
