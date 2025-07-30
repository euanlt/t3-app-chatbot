# Vercel Python serverless function handler for Pydantic AI agents
import sys
import os
from pathlib import Path

# Add the pydantic-ai-agent module to Python path
project_root = Path(__file__).parent.parent.parent
agent_path = project_root / "src" / "server" / "services" / "pydantic-ai-agent"
sys.path.insert(0, str(agent_path))

# Import the FastAPI app
from __init__ import app

# Create a handler for Vercel using the ASGI adapter
from mangum import Mangum

# Configure the handler with custom path handling
handler = Mangum(app, lifespan="off", api_gateway_base_path="/api/python")