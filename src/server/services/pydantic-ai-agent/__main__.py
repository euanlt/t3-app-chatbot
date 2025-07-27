"""Entry point for running the Pydantic AI agents server."""

import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    uvicorn.run(
        "pydantic-ai-agent:app",
        host="0.0.0.0",
        port=9000,
        reload=True,
        log_level="info"
    )