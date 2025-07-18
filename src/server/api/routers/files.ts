import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createLogger } from "~/server/services/logger";
import { TRPCError } from "@trpc/server";
import { fileProcessingService } from "~/server/services/fileProcessingService";
import { db } from "~/server/db";
import { ensureDefaultUser } from "~/server/services/defaultUser";

const logger = createLogger("FilesRouter");

// File metadata schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _fileMetadataSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimetype: z.string(),
  size: z.number(),
  uploadedAt: z.date(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  extractedText: z.string().optional(),
  error: z.string().optional(),
});

export type FileMetadata = z.infer<typeof _fileMetadataSchema>;

// Supported file types
const SUPPORTED_TYPES = {
  text: ["text/plain", "text/markdown", "text/csv", "application/json"],
  document: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"],
  code: [
    "text/javascript",
    "text/typescript",
    "text/python",
    "text/html",
    "text/css",
  ],
};

const ALL_SUPPORTED_TYPES = Object.values(SUPPORTED_TYPES).flat();

export const filesRouter = createTRPCRouter({
  getFileMetadata: publicProcedure
    .input(
      z.object({
        fileId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      logger.info("Fetching file metadata", { fileId: input.fileId });

      const file = await db.file.findUnique({
        where: { id: input.fileId },
      });

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      return file;
    }),

  getUploadedFiles: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }),
    )
    .query(async ({ input }) => {
      logger.info("Fetching uploaded files", {
        userId: input.userId,
        limit: input.limit,
        offset: input.offset,
      });

      // Ensure default user exists
      if (input.userId === "default-user") {
        await ensureDefaultUser();
      }

      const files = await db.file.findMany({
        where: { userId: input.userId },
        take: input.limit,
        skip: input.offset,
        orderBy: { createdAt: "desc" },
      });

      const total = await db.file.count({
        where: { userId: input.userId },
      });

      return {
        files,
        total,
        hasMore: input.offset + files.length < total,
      };
    }),

  deleteFile: publicProcedure
    .input(
      z.object({
        fileId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("Deleting file", { fileId: input.fileId });

      const success = await fileProcessingService.deleteFile(input.fileId);

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found or deletion failed",
        });
      }

      return {
        success: true,
        message: "File deleted successfully",
      };
    }),

  getSupportedFileTypes: publicProcedure.query(async () => {
    logger.info("Fetching supported file types");

    return {
      categories: SUPPORTED_TYPES,
      all: ALL_SUPPORTED_TYPES,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    };
  }),

  uploadFile: publicProcedure
    .input(
      z.object({
        file: z.object({
          name: z.string(),
          type: z.string(),
          size: z.number(),
          base64: z.string(),
        }),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("Uploading file", {
        name: input.file.name,
        type: input.file.type,
        size: input.file.size,
      });

      // Validate file type
      if (!ALL_SUPPORTED_TYPES.includes(input.file.type)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported file type: ${input.file.type}`,
        });
      }

      // Ensure default user exists if needed
      if (input.userId === "default-user") {
        await ensureDefaultUser();
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(input.file.base64, "base64");

      // Save file
      const result = await fileProcessingService.saveFile(
        buffer,
        input.file.name,
        input.file.type,
        input.userId
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Failed to upload file",
        });
      }

      return {
        success: true,
        file: {
          id: result.file.id,
          filename: result.file.filename,
          originalName: result.file.originalName,
          mimetype: result.file.mimetype,
          size: result.file.size,
          status: result.file.status,
          createdAt: result.file.createdAt,
        },
      };
    }),

  processFile: publicProcedure
    .input(
      z.object({
        fileId: z.string(),
        options: z
          .object({
            extractText: z.boolean().optional().default(true),
            analyzeImages: z.boolean().optional().default(true),
            ocrEnabled: z.boolean().optional().default(true),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("Processing file", {
        fileId: input.fileId,
        options: input.options,
      });

      // Reprocess file if needed
      await fileProcessingService.processFile(input.fileId);

      return {
        success: true,
        message: "File processing started",
        fileId: input.fileId,
      };
    }),

  getFileProcessingStatus: publicProcedure
    .input(
      z.object({
        fileId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      logger.info("Checking file processing status", { fileId: input.fileId });

      const file = await db.file.findUnique({
        where: { id: input.fileId },
        select: { status: true, error: true },
      });

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      // Log the actual database values for debugging
      if (file.status === "failed") {
        logger.error("File processing failed", {
          fileId: input.fileId,
          status: file.status,
          error: file.error,
          errorType: typeof file.error,
          errorLength: file.error?.length
        });
      }
      
      return {
        fileId: input.fileId,
        status: file.status as "pending" | "processing" | "completed" | "failed",
        progress: file.status === "completed" ? 100 : file.status === "processing" ? 50 : 0,
        message: file.error || "Processing " + file.status,
      };
    }),
});
