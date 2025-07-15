"use client";

import { useState, useRef, useEffect } from "react";
import { IoSend } from "react-icons/io5";
import ReactMarkdown from "react-markdown";
import { api } from "~/trpc/react";
import MCPUsageIndicator, { type MCPToolUsage } from "./MCPUsageIndicator";

interface Message {
  id: string;
  sender: "user" | "ai";
  message: string;
  timestamp: Date;
  model?: string;
  mcpToolsUsed?: MCPToolUsage[];
}

interface ChatWindowProps {
  selectedModel?: string;
  uploadedFiles?: Array<{ id: string; name: string; content?: string }>;
  conversationId?: string;
}

export default function ChatWindow({
  selectedModel,
  uploadedFiles,
  conversationId,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch chat history when conversation changes
  const { data: historyData } = api.chat.getChatHistory.useQuery(
    { conversationId: currentConversationId!, limit: 100 },
    { enabled: !!currentConversationId },
  );

  // Load messages from history
  useEffect(() => {
    if (historyData?.messages) {
      const formattedMessages: Message[] = historyData.messages.map((msg) => ({
        id: msg.id,
        sender: msg.sender as "user" | "ai",
        message: msg.content,
        timestamp: new Date(msg.createdAt),
        model: msg.model ?? undefined,
        mcpToolsUsed: msg.mcpToolsUsed ?? undefined,
      }));
      setMessages(formattedMessages);
    }
  }, [historyData]);

  // Update conversation when prop changes
  useEffect(() => {
    setCurrentConversationId(conversationId);
    if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId]);

  // tRPC mutation for sending messages
  const sendMessage = api.chat.sendMessage.useMutation({
    onSuccess: (response) => {
      // Update current conversation ID if a new one was created
      if (response.conversationId && !currentConversationId) {
        setCurrentConversationId(response.conversationId);
      }

      // Add AI response to messages
      const aiMessage: Message = {
        id: generateUUID(),
        sender: "ai",
        message: response.text,
        timestamp: response.timestamp,
        model: response.model,
        mcpToolsUsed: response.mcpToolsUsed,
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      // Add error message to chat
      const errorMessage: Message = {
        id: generateUUID(),
        sender: "ai",
        message: `Error: ${error.message}`,
        timestamp: new Date(),
        model: "error",
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !sendMessage.isPending) {
      // Add user message to chat
      const userMessage: Message = {
        id: generateUUID(),
        sender: "user",
        message: inputValue,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Prepare file context
      const fileContext =
        uploadedFiles?.map((f) => f.content ?? "").join("\n\n") ?? "";

      // Send message via tRPC
      sendMessage.mutate({
        message: inputValue,
        model: selectedModel,
        conversationId: currentConversationId,
        chatHistory: messages.map((m) => ({
          sender: m.sender,
          message: m.message,
          timestamp: m.timestamp,
          model: m.model,
        })),
        fileContext,
      });

      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-chat flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-secondary mt-8 text-center">
            <p className="text-lg">Welcome to AI Chatbot</p>
            <p className="mt-2 text-sm">
              {currentConversationId
                ? "Loading conversation history..."
                : "Start a conversation by typing a message below"}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`shadow-theme-sm max-w-[70%] rounded-lg p-3 ${
                  msg.sender === "user"
                    ? "bg-user-message text-user-message"
                    : msg.model === "error"
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "bg-ai-message border-primary text-ai-message border"
                }`}
              >
                {msg.sender === "ai" ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.message}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                )}

                {/* MCP Usage Indicator */}
                {msg.sender === "ai" &&
                  msg.mcpToolsUsed &&
                  msg.mcpToolsUsed.length > 0 && (
                    <MCPUsageIndicator toolsUsed={msg.mcpToolsUsed} />
                  )}

                {msg.model && (
                  <p className="mt-1 text-xs opacity-70">{msg.model}</p>
                )}
              </div>
            </div>
          ))
        )}
        {sendMessage.isPending && (
          <div className="flex justify-start">
            <div className="bg-ai-message border-primary shadow-theme-sm rounded-lg border p-3">
              <div className="flex space-x-2">
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="border-primary bg-primary border-t p-4"
      >
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="border-primary bg-input text-primary flex-1 resize-none rounded-lg border px-4 py-2 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows={1}
            disabled={sendMessage.isPending}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sendMessage.isPending}
            className="bg-button text-button hover:bg-button-hover shadow-theme-sm rounded-lg px-4 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IoSend className="h-5 w-5" />
          </button>
        </div>
        {uploadedFiles && uploadedFiles.length > 0 && (
          <div className="text-secondary mt-2 text-sm">
            {uploadedFiles.length} file(s) attached
          </div>
        )}
      </form>
    </div>
  );
}

// Simple UUID generator
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
