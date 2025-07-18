import { NextResponse } from "next/server";
import { env } from "~/env";
import OpenAI from "openai";

export async function GET() {
  try {
    // Check if API key exists
    if (!env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "OPENAI_API_KEY not found in environment variables",
        hasKey: false,
      });
    }

    // Check key format
    const keyPrefix = env.OPENAI_API_KEY.substring(0, 7);
    if (!env.OPENAI_API_KEY.startsWith("sk-")) {
      return NextResponse.json({
        success: false,
        error: "Invalid API key format (should start with sk-)",
        hasKey: true,
        keyPrefix,
      });
    }

    // Try to create OpenAI client
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Test with a simple embedding call
    const testText = "Hello, this is a test";
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: testText,
      dimensions: 1536,
    });

    // Check if we got a valid response
    const embedding = response.data[0]?.embedding;
    
    return NextResponse.json({
      success: true,
      message: "OpenAI API key is valid and working!",
      hasKey: true,
      keyPrefix,
      model: response.model,
      usage: response.usage,
      embeddingLength: embedding?.length || 0,
      testSuccessful: true,
    });

  } catch (error: any) {
    // Parse the error
    let errorMessage = "Unknown error";
    let errorType = "unknown";
    
    if (error?.status === 401) {
      errorMessage = "Invalid API key - authentication failed";
      errorType = "invalid_key";
    } else if (error?.status === 429) {
      errorMessage = "API quota exceeded - check your OpenAI billing";
      errorType = "quota_exceeded";
    } else if (error?.status === 404) {
      errorMessage = "Model not found - API key might not have access to embeddings";
      errorType = "model_access";
    } else if (error?.message) {
      errorMessage = error.message;
      errorType = error.type || "api_error";
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorType,
      hasKey: !!env.OPENAI_API_KEY,
      keyPrefix: env.OPENAI_API_KEY ? env.OPENAI_API_KEY.substring(0, 7) : null,
      status: error?.status,
      details: error?.error?.message || error?.message,
    });
  }
}