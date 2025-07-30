import { NextRequest, NextResponse } from "next/server";

// This route is only used in local development when NEXT_PUBLIC_AGENT_BACKEND_URL is not set
// In production, Vercel rewrites handle the routing to Python functions

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Only proxy in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is not available in production" },
      { status: 404 }
    );
  }

  const agentPath = params.path.join("/");
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:9000";
  
  try {
    // Proxy the request to the Python backend
    const targetUrl = `${pythonBackendUrl}/${agentPath}`;
    
    // For SSE (Server-Sent Events), we need to handle streaming
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Python backend returned ${response.status}` },
        { status: response.status }
      );
    }

    // Check if this is an SSE response
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("text/event-stream")) {
      // Create a TransformStream to proxy the SSE data
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } catch (error) {
            console.error("Error reading stream:", error);
          } finally {
            controller.close();
          }
        },
      });

      // Return SSE response with proper headers
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // For non-SSE responses, return as JSON
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying to Python backend:", error);
    return NextResponse.json(
      { error: "Failed to connect to Python backend", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Only proxy in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is not available in production" },
      { status: 404 }
    );
  }

  const agentPath = params.path.join("/");
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:9000";
  
  try {
    const body = await request.text();
    const targetUrl = `${pythonBackendUrl}/${agentPath}`;
    
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
      },
      body: body,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Python backend returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying to Python backend:", error);
    return NextResponse.json(
      { error: "Failed to connect to Python backend", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}