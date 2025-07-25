"use client";

import { useState, useEffect } from "react";
import ChatWindow from "./_components/chat/ChatWindow";
import Sidebar from "./_components/sidebar/Sidebar";
import AgentChat from "./_components/agents/AgentChat";
import { api } from "~/trpc/react";
import { FaArrowLeft } from "react-icons/fa";

interface UploadedFile {
  id: string;
  name: string;
  content?: string;
  status?: "pending" | "processing" | "completed" | "failed";
}

interface Agent {
  id: string;
  name: string;
  endpoint?: string;
  feature?: string;
}

export default function Home() {
  const [selectedModel, setSelectedModel] = useState(
    "mistralai/mistral-small-3.2-24b-instruct:free",
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });

  const uploadFileMutation = api.files.uploadFile.useMutation();
  const deleteFileMutation = api.files.deleteFile.useMutation();
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());

  // Poll for file processing status
  const { data: fileStatusData } = api.files.getFileProcessingStatus.useQuery(
    { fileId: Array.from(processingFiles)[0] || "" },
    { 
      enabled: processingFiles.size > 0,
      refetchInterval: 2000, // Poll every 2 seconds
    }
  );

  // Save sidebar collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.toString());
    }
  }, [isSidebarCollapsed]);

  // Update file status when polling returns data
  useEffect(() => {
    if (fileStatusData && processingFiles.has(fileStatusData.fileId)) {
      if (fileStatusData.status === "completed" || fileStatusData.status === "failed") {
        // Update the file status in our state
        setUploadedFiles((prev) => 
          prev.map((file) => 
            file.id === fileStatusData.fileId 
              ? { ...file, status: fileStatusData.status }
              : file
          )
        );
        // Remove from processing set
        setProcessingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileStatusData.fileId);
          return newSet;
        });
      }
    }
  }, [fileStatusData, processingFiles]);

  const handleFileUpload = async (files: FileList) => {
    const newFiles: UploadedFile[] = [];

    for (const file of files) {
      if (file) {
        try {
          // Convert file to base64
          const base64 = await fileToBase64(file);
          
          // Upload file via API
          const result = await uploadFileMutation.mutateAsync({
            file: {
              name: file.name,
              type: file.type,
              size: file.size,
              base64,
            },
            userId: "default-user",
          });

          if (result.success && result.file) {
            const fileStatus = result.file.status as "pending" | "processing" | "completed" | "failed";
            newFiles.push({
              id: result.file.id,
              name: result.file.originalName,
              status: fileStatus,
            });
            
            // Add to processing set if not completed
            if (fileStatus === "pending" || fileStatus === "processing") {
              setProcessingFiles((prev) => new Set(prev).add(result.file.id));
            }
          }
        } catch (error) {
          console.error("Failed to upload file:", error);
          // You might want to show an error toast here
        }
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileRemove = async (fileId: string) => {
    try {
      await deleteFileMutation.mutateAsync({ fileId });
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (error) {
      console.error("Failed to delete file:", error);
      // You might want to show an error toast here
    }
  };

  return (
    <div className="bg-secondary flex h-screen">
      {/* Sidebar */}
      <Sidebar
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        uploadedFiles={uploadedFiles}
        onFileUpload={handleFileUpload}
        onFileRemove={handleFileRemove}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSelectAgent={setSelectedAgent}
      />

      {/* Chat Area */}
      <div className="flex flex-1 flex-col relative">
        {/* Floating expand button when sidebar is collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="absolute left-4 top-4 z-10 bg-button text-button hover:bg-button-hover p-2 rounded-lg shadow-lg transition-all"
            title="Expand sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        {/* Back to chat button when in agent mode */}
        {selectedAgent && (
          <button
            onClick={() => setSelectedAgent(null)}
            className="absolute right-4 top-4 z-10 bg-button text-button hover:bg-button-hover px-4 py-2 rounded-lg shadow-lg transition-all flex items-center gap-2"
            title="Back to normal chat"
          >
            <FaArrowLeft className="h-4 w-4" />
            Back to Chat
          </button>
        )}
        
        {/* Conditionally render agent chat or normal chat */}
        {selectedAgent ? (
          <AgentChat
            agentId={selectedAgent.id}
            agentName={selectedAgent.name}
            endpoint={selectedAgent.endpoint || `/api/agents/${selectedAgent.id}`}
          />
        ) : (
          <ChatWindow
            selectedModel={selectedModel}
            uploadedFiles={uploadedFiles}
            conversationId={currentConversationId}
          />
        )}
      </div>
    </div>
  );
}

// Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(",")[1];
      if (base64Data) {
        resolve(base64Data);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}
