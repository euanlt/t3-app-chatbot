import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";
import { createLogger } from "./logger";

const logger = createLogger("SupabaseClient");

// Initialize Supabase client
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

logger.info("Supabase configuration check", {
  hasUrl: !!supabaseUrl,
  urlLength: supabaseUrl.length,
  hasServiceKey: !!supabaseServiceKey,
  keyLength: supabaseServiceKey.length,
  environment: process.env.NODE_ENV
});

if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn("Supabase credentials not configured. File uploads will not work in production.");
}

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// Storage bucket name for file uploads
export const STORAGE_BUCKET = "chatbot-uploads";

/**
 * Initialize storage bucket if it doesn't exist
 */
export async function initializeStorageBucket() {
  if (!supabase) {
    logger.warn("Supabase client not initialized. Skipping bucket creation.");
    return;
  }

  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      logger.error("Failed to list storage buckets", listError);
      return;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: false, // Keep files private
        fileSizeLimit: 10485760, // 10MB limit
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/csv',
          'text/markdown',
          'application/json',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp'
        ]
      });

      if (createError) {
        logger.error("Failed to create storage bucket", createError);
      } else {
        logger.info("Storage bucket created successfully", { bucket: STORAGE_BUCKET });
      }
    } else {
      logger.info("Storage bucket already exists", { bucket: STORAGE_BUCKET });
    }
  } catch (error) {
    logger.error("Error initializing storage bucket", error instanceof Error ? error : { error });
  }
}

// Initialize bucket on module load
if (supabase) {
  initializeStorageBucket().catch((error) => {
    logger.error("Failed to initialize storage bucket on load", error instanceof Error ? error : { error });
  });
}