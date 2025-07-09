"use client";

import { useState } from "react";
import ChatWindow from "./_components/chat/ChatWindow";
import Sidebar from "./_components/sidebar/Sidebar";

interface UploadedFile {
  id: string;
  name: string;
  content?: string;
}

export default function Home() {
  const [selectedModel, setSelectedModel] = useState("mistralai/mistral-small-3.2-24b-instruct:free");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFileUpload = async (files: FileList) => {
    // For now, just store file metadata
    // TODO: Implement actual file upload and processing
    const newFiles: UploadedFile[] = [];
    
    for (const file of files) {
      if (file) {
        newFiles.push({
          id: generateUUID(),
          name: file.name,
          content: "" // TODO: Process file content
        });
      }
    }
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="flex h-screen bg-secondary">
      {/* Sidebar */}
      <Sidebar
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        uploadedFiles={uploadedFiles}
        onFileUpload={handleFileUpload}
        onFileRemove={handleFileRemove}
      />
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatWindow 
          selectedModel={selectedModel}
          uploadedFiles={uploadedFiles}
        />
      </div>
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