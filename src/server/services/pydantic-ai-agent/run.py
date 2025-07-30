#!/usr/bin/env python3
"""Entry point for running the Pydantic AI agent server."""

import sys
import os
from pathlib import Path

# Load environment variables from project root
from dotenv import load_dotenv
project_root = Path(__file__).parent.parent.parent.parent.parent
env_path = project_root / '.env'
load_dotenv(env_path)

# Add the current directory to the Python path for imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

if __name__ == "__main__":
    import uvicorn
    # Use module path instead of direct import to avoid relative import issues
    uvicorn.run("__init__:app", host="0.0.0.0", port=9000, reload=True)