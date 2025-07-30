#!/usr/bin/env python3
"""Test script to check available imports and methods."""

import sys
print("Python version:", sys.version)

try:
    import pydantic_ai
    print(f"✓ pydantic_ai version: {pydantic_ai.__version__}")
except Exception as e:
    print(f"✗ pydantic_ai import error: {e}")

try:
    # Load env vars first
    from dotenv import load_dotenv
    load_dotenv()
    
    from pydantic_ai import Agent
    agent = Agent(model='openai:gpt-4o-mini')
    print("✓ Agent created successfully")
    
    # Check available methods
    methods = [m for m in dir(agent) if not m.startswith('_') and not m.isupper()]
    print("Available Agent methods:", methods[:10], "...")  # Show first 10
    
    # Check for to_ag_ui method
    if hasattr(agent, 'to_ag_ui'):
        print("✓ agent.to_ag_ui() method exists")
        try:
            app = agent.to_ag_ui()
            print(f"✓ AG-UI app created: {type(app)}")
        except Exception as e:
            print(f"✗ to_ag_ui() error: {e}")
    else:
        print("✗ agent.to_ag_ui() method NOT found")
        
except Exception as e:
    print(f"✗ Agent creation error: {e}")

try:
    import ag_ui
    print(f"✓ ag_ui available")
    print("ag_ui submodules:", [attr for attr in dir(ag_ui) if not attr.startswith('_')])
except Exception as e:
    print(f"✗ ag_ui import error: {e}")

try:
    from pydantic_ai import ag_ui as pai_ag_ui
    print("✓ pydantic_ai.ag_ui available")
    print("pydantic_ai.ag_ui contents:", [attr for attr in dir(pai_ag_ui) if not attr.startswith('_')])
except Exception as e:
    print(f"✗ pydantic_ai.ag_ui import error: {e}")

try:
    from ag_ui import core
    print("✓ ag_ui.core available")
    print("ag_ui.core contents:", [attr for attr in dir(core) if not attr.startswith('_')])
except Exception as e:
    print(f"✗ ag_ui.core import error: {e}")