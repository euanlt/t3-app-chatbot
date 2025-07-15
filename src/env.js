import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    OPENROUTER_API_KEY: z.string().optional().default(""),
    LOG_LEVEL: z
      .enum(["ERROR", "WARN", "INFO", "DEBUG", "TRACE"])
      .optional()
      .default("INFO"),
    UPLOAD_DIR: z.string().optional().default("./uploads"),
    MAX_FILE_SIZE: z.string().optional().default("10485760"),
    PERPLEXITY_API_KEY: z.string().optional(),
    BRAVE_API_KEY: z.string().optional(),
    FIRECRAWL_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    ENCRYPTION_KEY: z.string().optional().default("default-key-change-in-production"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    LOG_LEVEL: process.env.LOG_LEVEL,
    UPLOAD_DIR: process.env.UPLOAD_DIR,
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    BRAVE_API_KEY: process.env.BRAVE_API_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
