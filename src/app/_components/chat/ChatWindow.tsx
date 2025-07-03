"use client";

import { useState, useRef, useEffect } from 'react';
import { IoSend } from 'react-icons/io5';
import ReactMarkdown from 'react-markdown';
import { api } from "~/trpc/react";

interface Message {
  id: string;
  sender: 'user' | 'ai';
  message: string;
  timestamp: Date;
  model?: string;
}

interface ChatWindowProps {
  selectedModel?: string;
  uploadedFiles?: Array<{ id: string; name: string; content?: string }>;
}

export default function ChatWindow({ selectedModel, uploadedFiles }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // tRPC mutation for sending messages
  const sendMessage = api.chat.sendMessage.useMutation({
    onSuccess: (response) => {
      // Add AI response to messages
      const aiMessage: Message = {
        id: generateUUID(),
        sender: 'ai',
        message: response.text,
        timestamp: response.timestamp,
        model: response.model
      };
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      // Add error message to chat
      const errorMessage: Message = {
        id: generateUUID(),
        sender: 'ai',
        message: `Error: ${error.message}`,
        timestamp: new Date(),
        model: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        sender: 'user',
        message: inputValue,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Prepare file context
      const fileContext = uploadedFiles?.map(f => f.content || '').join('\n\n') || '';

      // Send message via tRPC
      sendMessage.mutate({
        message: inputValue,
        model: selectedModel,
        chatHistory: messages.map(m => ({
          sender: m.sender,
          message: m.message,
          timestamp: m.timestamp,
          model: m.model
        })),
        fileContext
      });

      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg">Welcome to AI Chatbot</p>
            <p className="text-sm mt-2">Start a conversation by typing a message below</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.model === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {msg.sender === 'ai' ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.message}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                )}
                {msg.model && (
                  <p className="text-xs opacity-70 mt-1">
                    {msg.model}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        {sendMessage.isPending && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t bg-white p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
            disabled={sendMessage.isPending}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sendMessage.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <IoSend className="w-5 h-5" />
          </button>
        </div>
        {uploadedFiles && uploadedFiles.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            {uploadedFiles.length} file(s) attached
          </div>
        )}
      </form>
    </div>
  );
}

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}