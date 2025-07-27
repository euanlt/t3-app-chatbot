"""FastAPI application for Pydantic AI agents with AG-UI protocol."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .agents.agentic_chat import app as agentic_chat_app
from .agents.human_in_the_loop import app as human_in_the_loop_app
from .agents.agentic_generative_ui import app as agentic_generative_ui_app
from .agents.tool_based_generative_ui import app as tool_based_generative_ui_app
from .agents.shared_state import app as shared_state_app
from .agents.predictive_state_updates import app as predictive_state_updates_app

# Create main FastAPI app
app = FastAPI(
    title="Pydantic AI Agents",
    description="AI agents using AG-UI protocol",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount agent apps
app.mount("/agentic_chat", agentic_chat_app)
app.mount("/human_in_the_loop", human_in_the_loop_app)
app.mount("/agentic_generative_ui", agentic_generative_ui_app)
app.mount("/tool_based_generative_ui", tool_based_generative_ui_app)
app.mount("/shared_state", shared_state_app)
app.mount("/predictive_state_updates", predictive_state_updates_app)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Pydantic AI Agents API",
        "agents": [
            "/agentic_chat",
            "/human_in_the_loop",
            "/agentic_generative_ui",
            "/tool_based_generative_ui",
            "/shared_state",
            "/predictive_state_updates"
        ]
    }

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}