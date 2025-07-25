"""
Base utilities for running PydanticAI agents on Vercel serverless functions.
"""

import json
import os
from typing import Any, Dict, List, AsyncIterable
from urllib.parse import parse_qs

from pydantic_ai import Agent
from ag_ui_protocol import (
    RunAgentInput,
    Event,
    EventType,
    MessagePart,
    MessagePartType,
    UserMessage,
    AssistantMessage,
    SystemMessage,
    ToolCallMessage,
    ToolReturnMessage,
    AgentResponseEvent,
    AgentStateEvent,
    ErrorEvent,
)


class VercelAgentHandler:
    """Handler for running PydanticAI agents in Vercel serverless functions."""
    
    def __init__(self, agent: Agent):
        self.agent = agent
    
    async def handle_request(self, event: Dict[str, Any], context: Any) -> Dict[str, Any]:
        """Main handler for Vercel serverless function requests."""
        try:
            # Parse HTTP method and body
            method = event.get('httpMethod', 'POST')
            if method != 'POST':
                return self._error_response(405, 'Method not allowed')
            
            # Parse request body
            body = event.get('body', '{}')
            if event.get('isBase64Encoded'):
                import base64
                body = base64.b64decode(body).decode('utf-8')
            
            try:
                request_data = json.loads(body)
                run_input = RunAgentInput.model_validate(request_data)
            except Exception as e:
                return self._error_response(400, f'Invalid request body: {e}')
            
            # Set up streaming response
            return await self._stream_agent_response(run_input)
            
        except Exception as e:
            return self._error_response(500, f'Internal server error: {e}')
    
    async def _stream_agent_response(self, run_input: RunAgentInput) -> Dict[str, Any]:
        """Stream agent response using Server-Sent Events."""
        
        # Convert AG-UI messages to PydanticAI format
        messages = self._convert_messages(run_input.messages)
        
        # Start streaming response
        response_chunks = []
        
        try:
            # Send initial event
            response_chunks.append(self._format_sse_event({
                'type': 'agent_response',
                'data': {'status': 'started'}
            }))
            
            # Run the agent
            async with self.agent.run_stream(
                messages[-1].content if messages else "",
                message_history=messages[:-1] if len(messages) > 1 else []
            ) as result:
                async for chunk in result.stream():
                    # Convert chunk to AG-UI event
                    event_data = {
                        'type': 'agent_response',
                        'data': {
                            'content': chunk,
                            'timestamp': result.timestamp().isoformat() if hasattr(result, 'timestamp') else None
                        }
                    }
                    response_chunks.append(self._format_sse_event(event_data))
                
                # Send final result
                final_result = await result
                final_event = {
                    'type': 'agent_response',
                    'data': {
                        'content': final_result.data,
                        'status': 'completed',
                        'cost': final_result.usage().total_cost if hasattr(final_result, 'usage') else None
                    }
                }
                response_chunks.append(self._format_sse_event(final_event))
            
        except Exception as e:
            error_event = {
                'type': 'error',
                'data': {'message': str(e)}
            }
            response_chunks.append(self._format_sse_event(error_event))
        
        # Return streaming response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': ''.join(response_chunks),
            'isBase64Encoded': False
        }
    
    def _convert_messages(self, ag_ui_messages: List[Dict[str, Any]]) -> List[Any]:
        """Convert AG-UI messages to PydanticAI message format."""
        messages = []
        
        for msg in ag_ui_messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            if role == 'user':
                messages.append({'role': 'user', 'content': content})
            elif role == 'assistant':
                messages.append({'role': 'assistant', 'content': content})
            elif role == 'system':
                messages.append({'role': 'system', 'content': content})
        
        return messages
    
    def _format_sse_event(self, event_data: Dict[str, Any]) -> str:
        """Format data as Server-Sent Event."""
        data_str = json.dumps(event_data)
        return f"data: {data_str}\n\n"
    
    def _error_response(self, status_code: int, message: str) -> Dict[str, Any]:
        """Return error response."""
        return {
            'statusCode': status_code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': message})
        }


def create_agent_handler(agent: Agent):
    """Create a Vercel-compatible handler function for a PydanticAI agent."""
    handler = VercelAgentHandler(agent)
    
    async def vercel_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
        return await handler.handle_request(event, context)
    
    return vercel_handler