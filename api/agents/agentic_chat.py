"""
Basic agentic chat agent for Vercel serverless deployment.
"""

import os
import json
from datetime import datetime
from http.server import BaseHTTPRequestHandler
import asyncio

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel


# Create the model
model = OpenAIModel(
    'gpt-4o-mini',
    api_key=os.getenv('OPENAI_API_KEY')
)

# Create the agent
chat_agent = Agent(
    model,
    system_prompt=(
        'You are a helpful AI assistant. '
        'You can help with various tasks including checking the time and '
        'having conversations. Be friendly and helpful!'
    ),
)


@chat_agent.tool
async def get_current_time() -> str:
    """Get the current time."""
    return f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}"


@chat_agent.tool
async def set_background_color(color: str) -> str:
    """
    Set the background color of the UI.
    This is a demo tool - in a real implementation it would communicate with the frontend.
    """
    valid_colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'white', 'black']
    
    if color.lower() not in valid_colors:
        return f"Sorry, '{color}' is not a valid color. Available colors: {', '.join(valid_colors)}"
    
    return f"Background color set to {color}! 🎨"


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length).decode('utf-8')
            
            # Parse request
            try:
                request_data = json.loads(body)
                messages = request_data.get('messages', [])
            except:
                self.send_error(400, 'Invalid JSON')
                return
            
            # Get the latest user message
            user_message = ""
            for msg in reversed(messages):
                if msg.get('role') == 'user':
                    user_message = msg.get('content', '')
                    break
            
            if not user_message:
                user_message = "Hello!"
            
            # Run the agent
            async def run_agent():
                result = await chat_agent.run(user_message)
                return result.data
            
            response_text = asyncio.run(run_agent())
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            response = {
                'type': 'agent_response',
                'data': {
                    'content': response_text,
                    'status': 'completed'
                }
            }
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()