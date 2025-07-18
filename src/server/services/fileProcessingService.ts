import fs from "fs/promises";
import path from "path";
import { createLogger } from "./logger";
import { db } from "~/server/db";
import type { File } from "@prisma/client";
import { env } from "~/env";
import mammoth from "mammoth";
// Dynamic import to prevent build-time issues
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ragService } from "./ragService";
import { supabase, STORAGE_BUCKET } from "./supabaseClient";

const logger = createLogger("FileProcessingService");

// Get upload directory from env or use default
const UPLOAD_DIR = env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = parseInt(env.MAX_FILE_SIZE || "10485760"); // 10MB default

// Supported file types and their processors
const FILE_PROCESSORS: Record<string, (filePath: string) => Promise<string>> = {
  // Text files
  "text/plain": readTextFile,
  "text/markdown": readTextFile,
  "text/csv": readTextFile,
  "application/json": readTextFile,
  "text/javascript": readTextFile,
  "text/typescript": readTextFile,
  "text/html": readTextFile,
  "text/css": readTextFile,
  
  // Documents
  "application/pdf": extractPdfText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": extractDocxText,
  
  // Images (with OCR)
  "image/jpeg": extractImageTextWithGemini,
  "image/png": extractImageTextWithGemini,
  "image/gif": extractImageTextWithGemini,
  "image/webp": extractImageTextWithGemini,
  "image/bmp": extractImageTextWithGemini,
};

export interface FileUploadResult {
  file: File;
  success: boolean;
  error?: string;
}

async function readTextFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, "utf-8");
}

async function extractPdfText(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const { default: pdf } = await import("pdf-parse");
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    logger.error("Failed to extract PDF text", { filePath, error });
    throw new Error("Failed to extract text from PDF");
  }
}

async function extractDocxText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    logger.error("Failed to extract DOCX text", { filePath, error });
    throw new Error("Failed to extract text from DOCX");
  }
}

async function extractImageTextWithGemini(filePath: string): Promise<string> {
  try {
    // Check if Google API key is available
    if (!env.GOOGLE_API_KEY || env.GOOGLE_API_KEY.trim() === "") {
      logger.warn("Google API key not available, skipping OCR", { filePath });
      return "[Image uploaded - Google API key required for text extraction]";
    }

    const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Read image file and convert to base64
    const imageBuffer = await fs.readFile(filePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Get MIME type from file extension
    const mimeType = getMimeTypeFromPath(filePath);
    
    logger.info("Processing image with Gemini Vision", { 
      filePath, 
      mimeType, 
      imageSize: imageBuffer.length 
    });

    // Create prompt for OCR and image description
    const prompt = `Please analyze this image and provide:
1. Extract ALL visible text exactly as it appears (if any)
2. If it's a screenshot, document, or diagram, focus on text extraction
3. If it's a photo or artwork, describe what you see
4. If no text is found, provide a detailed description of the image

Format your response as:
TEXT FOUND: [extracted text or "None"]
DESCRIPTION: [description of the image]`;

    const imageParts = [{
      inlineData: {
        data: base64Image,
        mimeType: mimeType
      }
    }];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response.text();
    
    logger.info("Gemini Vision OCR completed", { 
      filePath, 
      responseLength: response.length 
    });
    
    return response;
  } catch (error) {
    logger.error("Failed to extract text from image", { filePath, error });
    
    // Return a descriptive error message instead of throwing
    return `[Image uploaded - OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

function getMimeTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
  };
  
  return mimeTypes[ext] || 'image/jpeg';
}

export class FileProcessingService {
  private uploadDir: string;
  private useLocalStorage: boolean;

  constructor() {
    this.uploadDir = path.resolve(UPLOAD_DIR);
    // Use local storage in development or if Supabase is not configured
    this.useLocalStorage = process.env.NODE_ENV === "development" || !supabase;
    
    logger.info("FileProcessingService initialized", {
      environment: process.env.NODE_ENV,
      useLocalStorage: this.useLocalStorage,
      supabaseConfigured: !!supabase,
      uploadDir: this.uploadDir
    });
    
    if (this.useLocalStorage) {
      this.ensureUploadDirectory();
    }
  }

  private async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      logger.info("Created upload directory", { path: this.uploadDir });
    }
  }

  /**
   * Save uploaded file and create database record
   */
  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    userId?: string
  ): Promise<FileUploadResult> {
    try {
      // Validate file size
      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
      }

      // Generate unique filename
      const fileId = this.generateFileId();
      const extension = path.extname(originalName);
      const filename = `${fileId}${extension}`;
      
      let filePath: string;
      let storageUrl: string | null = null;

      if (this.useLocalStorage) {
        // Local storage for development
        filePath = path.join(this.uploadDir, filename);
        await fs.writeFile(filePath, buffer);
        logger.info("File saved to disk", { filename, size: buffer.length });
      } else if (supabase) {
        // Supabase storage for production
        const storagePath = `uploads/${userId || 'anonymous'}/${filename}`;
        
        logger.info("Attempting Supabase upload", { 
          bucket: STORAGE_BUCKET,
          path: storagePath,
          size: buffer.length,
          mimetype
        });
        
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, buffer, {
            contentType: mimetype,
            upsert: false,
          });

        if (error) {
          logger.error("Supabase upload failed", { 
            error: error.message || error,
            bucket: STORAGE_BUCKET,
            path: storagePath 
          });
          throw error;
        }

        // Get the public URL for the file
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);
          
        storageUrl = urlData.publicUrl;
        logger.info("File saved to Supabase Storage", { 
          filename, 
          size: buffer.length,
          path: storagePath,
          url: storageUrl,
        });
        
        // Set filePath to the Supabase path for consistency
        filePath = storageUrl;
      } else {
        throw new Error("No storage backend available");
      }

      // Create database record
      const file = await db.file.create({
        data: {
          filename,
          originalName,
          mimetype,
          size: buffer.length,
          path: filePath,
          status: "pending",
          userId,
        },
      });

      // Process file asynchronously
      this.processFile(file.id).catch((error) => {
        logger.error("Failed to process file", { fileId: file.id, error });
      });

      return { file, success: true };
    } catch (error) {
      logger.error("Failed to save file", { originalName, error });
      return {
        file: {} as File,
        success: false,
        error: error instanceof Error ? error.message : "Failed to save file",
      };
    }
  }

  /**
   * Process file to extract text content
   */
  async processFile(fileId: string): Promise<void> {
    try {
      // Get file from database
      const file = await db.file.findUnique({ where: { id: fileId } });
      if (!file) {
        throw new Error("File not found");
      }

      // Update status to processing
      await db.file.update({
        where: { id: fileId },
        data: { status: "processing" },
      });

      // Check if we have a processor for this file type
      const processor = FILE_PROCESSORS[file.mimetype];
      if (!processor) {
        logger.info("No text processor for file type", { mimetype: file.mimetype });
        await db.file.update({
          where: { id: fileId },
          data: { 
            status: "completed",
            extractedText: null,
          },
        });
        return;
      }

      // Get file content based on storage type
      let fileBuffer: Buffer;
      if (file.path?.startsWith('http')) {
        // File is in Supabase Storage - download it
        const response = await fetch(file.path);
        if (!response.ok) {
          throw new Error(`Failed to download file from storage: ${response.statusText}`);
        }
        fileBuffer = Buffer.from(await response.arrayBuffer());
        
        // Create a temporary file for processors that need file paths
        const tempDir = process.env.NODE_ENV === 'production' ? '/tmp' : UPLOAD_DIR;
        const tempPath = path.join(tempDir, `temp_${path.basename(file.filename)}`);
        await fs.writeFile(tempPath, fileBuffer);
        
        try {
          // Extract text using the temporary file
          const extractedText = await processor(tempPath);
          logger.info("Text extracted from file", { 
            fileId, 
            textLength: extractedText.length 
          });
          
          // Clean up temporary file
          await fs.unlink(tempPath).catch(() => {});
          
          // Update database with extracted text
          await db.file.update({
            where: { id: fileId },
            data: {
              status: "completed",
              extractedText,
            },
          });
          
          // Process embeddings for RAG if text was extracted
          if (extractedText && extractedText.trim().length > 0) {
            logger.info("Processing embeddings for RAG", { fileId });
            await ragService.processFile(fileId);
          }
        } finally {
          // Ensure temp file is cleaned up
          await fs.unlink(tempPath).catch(() => {});
        }
        
        return;
      }

      // Extract text for local files
      const extractedText = await processor(file.path!);
      logger.info("Text extracted from file", { 
        fileId, 
        textLength: extractedText.length 
      });

      // Update database with extracted text
      await db.file.update({
        where: { id: fileId },
        data: {
          status: "completed",
          extractedText,
        },
      });

      // Process embeddings for RAG if text was extracted
      if (extractedText && extractedText.trim().length > 0) {
        logger.info("Processing embeddings for RAG", { fileId });
        await ragService.processFile(fileId);
      }
    } catch (error) {
      logger.error("Failed to process file", { fileId, error });
      
      // Ensure we have a proper error message
      let errorMessage = "Processing failed";
      if (error instanceof Error) {
        errorMessage = error.message || "Unknown error occurred";
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = String(error.message);
      } else {
        errorMessage = `Processing failed: ${JSON.stringify(error) || "Unknown error"}`;
      }
      
      // Update database with error
      await db.file.update({
        where: { id: fileId },
        data: {
          status: "failed",
          error: errorMessage,
        },
      });
    }
  }

  /**
   * Get file content for chat context
   */
  async getFileContent(fileId: string): Promise<string | null> {
    try {
      const file = await db.file.findUnique({
        where: { id: fileId },
        select: { extractedText: true, status: true, originalName: true },
      });

      if (!file) {
        logger.warn("File not found", { fileId });
        return null;
      }

      if (file.status === "completed" && file.extractedText) {
        return `File: ${file.originalName}\n\n${file.extractedText}`;
      }

      if (file.status === "processing") {
        return `File: ${file.originalName} (still processing...)`;
      }

      return null;
    } catch (error) {
      logger.error("Failed to get file content", { fileId, error });
      return null;
    }
  }

  /**
   * Delete file from disk and database
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const file = await db.file.findUnique({
        where: { id: fileId },
        select: { path: true },
      });

      if (!file) {
        return false;
      }

      // Delete from storage
      if (file.path) {
        if (file.path.startsWith('http') && supabase) {
          // File is in Supabase Storage
          try {
            // Extract the storage path from the URL
            const urlParts = file.path.split('/');
            const storagePathIndex = urlParts.findIndex(part => part === STORAGE_BUCKET);
            if (storagePathIndex !== -1) {
              const storagePath = urlParts.slice(storagePathIndex + 1).join('/');
              
              const { error } = await supabase.storage
                .from(STORAGE_BUCKET)
                .remove([storagePath]);
                
              if (error) {
                logger.error("Failed to delete file from Supabase", { path: storagePath, error });
              } else {
                logger.info("File deleted from Supabase", { path: storagePath });
              }
            }
          } catch (error) {
            logger.error("Failed to delete file from storage", { path: file.path, error: error instanceof Error ? error : { error } });
          }
        } else {
          // Local file
          try {
            await fs.unlink(file.path);
            logger.info("File deleted from disk", { path: file.path });
          } catch (error) {
            logger.error("Failed to delete file from disk", { path: file.path, error: error instanceof Error ? error : { error } });
          }
        }
      }

      // Delete from database
      await db.file.delete({ where: { id: fileId } });
      logger.info("File deleted from database", { fileId });

      return true;
    } catch (error) {
      logger.error("Failed to delete file", { fileId, error });
      return false;
    }
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(daysOld = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldFiles = await db.file.findMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
        select: { id: true, path: true },
      });

      let deletedCount = 0;
      for (const file of oldFiles) {
        if (await this.deleteFile(file.id)) {
          deletedCount++;
        }
      }

      logger.info("Cleaned up old files", { count: deletedCount, daysOld });
      return deletedCount;
    } catch (error) {
      logger.error("Failed to cleanup old files", { error });
      return 0;
    }
  }

  private generateFileId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

// Export singleton instance
export const fileProcessingService = new FileProcessingService();