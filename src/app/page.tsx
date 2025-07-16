"use client";

import { useState, useEffect } from "react";
import ChatWindow from "./_components/chat/ChatWindow";
import Sidebar from "./_components/sidebar/Sidebar";
import { api } from "~/trpc/react";

interface UploadedFile {
  id: string;
  name: string;
  content?: string;
  status?: "pending" | "processing" | "completed" | "failed";
}

export default function Home() {
  const [selectedModel, setSelectedModel] = useState(
    "mistralai/mistral-small-3.2-24b-instruct:free",
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >();

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
      />

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        <ChatWindow
          selectedModel={selectedModel}
          uploadedFiles={uploadedFiles}
          conversationId={currentConversationId}
        />
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
