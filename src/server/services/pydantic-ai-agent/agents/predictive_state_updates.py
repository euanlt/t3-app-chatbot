"""Predictive State Updates feature using Pydantic AI with AG-UI protocol."""

from __future__ import annotations

import asyncio
import os
from textwrap import dedent
from typing import AsyncIterator, List, Tuple

from pydantic import BaseModel, Field

from ag_ui.core import CustomEvent, EventType
from pydantic_ai import Agent, RunContext
from pydantic_ai.ag_ui import StateDeps


class DocumentDiff(BaseModel):
    """A diff representing a change to the document."""
    type: str = Field(description="Type of change: addition, deletion, modification")
    line: int = Field(description="Line number where the change occurs")
    content: str = Field(description="The content being changed")
    preview: str = Field(description="Preview of what's being changed")


class DocumentState(BaseModel):
    """State for the document being written."""
    document: str = ''
    diffs: List[DocumentDiff] = Field(default_factory=list)
    version: int = 0


# Create the agent with state dependencies
agent = Agent(
    model=os.getenv('OPENAI_MODEL', 'openai:gpt-4o-mini'),
    deps_type=StateDeps[DocumentState],
    system_prompt=dedent("""
        You are a collaborative document editor with predictive text capabilities.
        
        When editing documents:
        - Show character-by-character updates for a live editing experience
        - Provide diff visualization to show what's changing
        - Allow the user to see predictions before they're applied
        - Support real-time collaborative editing patterns
        
        Use the document editing tools to demonstrate these capabilities.
    """)
)


# Tools which return AG-UI events
@agent.tool_plain
async def document_predict_state() -> List[CustomEvent]:
    """Enable document state prediction.
    
    Returns:
        CustomEvent containing the event to enable state prediction.
    """
    return [
        CustomEvent(
            type=EventType.CUSTOM,
            name='PredictState',
            value=[
                {
                    'state_key': 'document',
                    'tool': 'write_document',
                    'tool_argument': 'document',
                },
            ],
        ),
    ]


@agent.tool
async def write_document(
    ctx: RunContext[StateDeps[DocumentState]],
    document: str
) -> AsyncIterator[CustomEvent]:
    """Write or update the document with live updates.
    
    Args:
        document: The new document content
    
    Yields:
        Events showing live document updates
    """
    current_doc = ctx.deps.state.document
    
    # Calculate diffs between current and new document
    diffs = calculate_diffs(current_doc, document)
    
    # Yield diff preview
    yield CustomEvent(
        type=EventType.CUSTOM,
        name='document_diffs',
        value={
            'diffs': [diff.model_dump() for diff in diffs],
            'version': ctx.deps.state.version + 1
        }
    )
    
    # Simulate character-by-character typing for additions
    temp_doc = current_doc
    for diff in diffs:
        if diff.type == 'addition':
            # Type each character with a small delay
            for i, char in enumerate(diff.content):
                await asyncio.sleep(0.05)  # 50ms per character for realistic typing
                temp_doc = insert_at_position(temp_doc, diff.line, i, char)
                
                yield CustomEvent(
                    type=EventType.CUSTOM,
                    name='document_update',
                    value={
                        'document': temp_doc,
                        'cursor_position': {'line': diff.line, 'column': i + 1},
                        'is_typing': True
                    }
                )
    
    # Update final state
    ctx.deps.state.document = document
    ctx.deps.state.version += 1
    
    yield CustomEvent(
        type=EventType.CUSTOM,
        name='document_update',
        value={
            'document': document,
            'version': ctx.deps.state.version,
            'is_typing': False,
            'complete': True
        }
    )


@agent.tool
async def suggest_edits(
    ctx: RunContext[StateDeps[DocumentState]],
    edit_type: str = "improve"
) -> List[CustomEvent]:
    """Suggest edits to the current document.
    
    Args:
        edit_type: Type of edit (improve, expand, summarize, fix_grammar)
    
    Returns:
        Suggested edits as diffs
    """
    current_doc = ctx.deps.state.document
    
    if not current_doc:
        return [
            CustomEvent(
                type=EventType.CUSTOM,
                name='error',
                value={'message': 'No document to edit. Please write some content first.'}
            )
        ]
    
    # Generate suggestions based on edit type
    suggestions = []
    
    if edit_type == "improve":
        suggestions = [
            DocumentDiff(
                type="modification",
                line=0,
                content="[Improved opening with stronger hook]",
                preview="Making the introduction more engaging..."
            ),
            DocumentDiff(
                type="addition",
                line=1,
                content="\n\n[Additional context paragraph]",
                preview="Adding more context..."
            )
        ]
    elif edit_type == "fix_grammar":
        suggestions = [
            DocumentDiff(
                type="modification",
                line=0,
                content="[Grammatically corrected text]",
                preview="Fixing grammar and punctuation..."
            )
        ]
    
    return [
        CustomEvent(
            type=EventType.CUSTOM,
            name='edit_suggestions',
            value={
                'suggestions': [s.model_dump() for s in suggestions],
                'edit_type': edit_type
            }
        )
    ]


def calculate_diffs(old_text: str, new_text: str) -> List[DocumentDiff]:
    """Calculate diffs between two texts.
    
    Simple implementation - in production would use proper diff algorithm.
    """
    if not old_text:
        return [
            DocumentDiff(
                type="addition",
                line=0,
                content=new_text,
                preview="Adding new content..."
            )
        ]
    
    # For demo, just show as replacement
    return [
        DocumentDiff(
            type="modification",
            line=0,
            content=new_text,
            preview="Updating document content..."
        )
    ]


def insert_at_position(text: str, line: int, column: int, char: str) -> str:
    """Insert a character at a specific position in the text."""
    lines = text.split('\n') if text else ['']
    
    if line >= len(lines):
        lines.extend([''] * (line - len(lines) + 1))
    
    line_text = lines[line]
    if column > len(line_text):
        line_text += ' ' * (column - len(line_text))
    
    lines[line] = line_text[:column] + char + line_text[column:]
    return '\n'.join(lines)


# Convert to AG-UI app
app = agent.to_ag_ui(deps=StateDeps(DocumentState()))