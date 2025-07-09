"use client";

import { useState } from "react";
import {
  FaCog,
  FaSearch,
  FaFile,
  FaCode,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

export interface MCPToolUsage {
  toolName: string;
  serverName: string;
  serverId: string;
  success: boolean;
  executionTime: number;
  error?: string;
  timestamp: Date;
}

interface MCPUsageIndicatorProps {
  toolsUsed: MCPToolUsage[];
}

export default function MCPUsageIndicator({
  toolsUsed,
}: MCPUsageIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!toolsUsed || toolsUsed.length === 0) {
    return null;
  }

  const getToolIcon = (toolName: string) => {
    const name = toolName.toLowerCase();
    if (name.includes("search")) return <FaSearch className="h-3 w-3" />;
    if (
      name.includes("file") ||
      name.includes("read") ||
      name.includes("write")
    )
      return <FaFile className="h-3 w-3" />;
    if (name.includes("git") || name.includes("code"))
      return <FaCode className="h-3 w-3" />;
    return <FaCog className="h-3 w-3" />;
  };

  const successCount = toolsUsed.filter((tool) => tool.success).length;
  const failureCount = toolsUsed.filter((tool) => !tool.success).length;

  return (
    <div className="mt-2 mb-1">
      {/* Summary Badge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-tertiary hover:bg-secondary text-secondary inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors"
      >
        <FaCog className="h-3 w-3" />
        <span>
          {toolsUsed.length} MCP tool{toolsUsed.length !== 1 ? "s" : ""} used
        </span>
        {successCount > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <FaCheckCircle className="h-3 w-3" />
            {successCount}
          </span>
        )}
        {failureCount > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <FaExclamationTriangle className="h-3 w-3" />
            {failureCount}
          </span>
        )}
        {isExpanded ? (
          <FaChevronUp className="h-3 w-3" />
        ) : (
          <FaChevronDown className="h-3 w-3" />
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="bg-tertiary border-primary mt-2 rounded-lg border p-3">
          <div className="space-y-2">
            {toolsUsed.map((tool, index) => (
              <div
                key={index}
                className={`flex items-center justify-between rounded border p-2 ${
                  tool.success
                    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                    : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {getToolIcon(tool.toolName)}
                  <div>
                    <div className="text-primary text-sm font-medium">
                      {tool.serverName}/{tool.toolName}
                    </div>
                    {tool.error && (
                      <div className="mt-1 text-xs text-red-600">
                        {tool.error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-tertiary flex items-center gap-2 text-xs">
                  <span>{tool.executionTime}ms</span>
                  {tool.success ? (
                    <FaCheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <FaExclamationTriangle className="h-3 w-3 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-primary text-tertiary mt-3 border-t pt-2 text-xs">
            <div className="flex justify-between">
              <span>Total execution time:</span>
              <span>
                {toolsUsed.reduce((sum, tool) => sum + tool.executionTime, 0)}ms
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Success rate:</span>
              <span>
                {Math.round((successCount / toolsUsed.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
