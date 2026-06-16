import os
from mcp.server.fastmcp import FastMCP

from api.memory.engine import fetch_memory, fetch_skills, store_memory
from api.agents.ingestion_agent import run_ingestion

mcp = FastMCP(
    "Company Brain",
    instructions=(
        "Company Brain is an organizational memory OS. "
        "Use these tools to read and write company knowledge, skills, and data."
    ),
)


@mcp.tool()
async def get_memory(query: str, user_id: str) -> str:
    """
    Retrieve memories relevant to a query for a specific user.

    Args:
        query: The search query to find relevant memories.
        user_id: The user/organization identifier.
    """
    try:
        memories = await fetch_memory(query, user_id, limit=5)
        if not memories:
            return f"No memories found for user '{user_id}' matching query: {query}"
        formatted = "\n".join(f"{i + 1}. {m}" for i, m in enumerate(memories))
        return f"Memories for '{user_id}' (query: {query}):\n\n{formatted}"
    except Exception as e:
        return f"Error retrieving memories: {str(e)}"


@mcp.tool()
async def get_skills(user_id: str) -> str:
    """
    Retrieve all executable skills for a specific user/organization.

    Args:
        user_id: The user/organization identifier.
    """
    try:
        skills = await fetch_skills(user_id)
        if not skills:
            return f"No skills found for user '{user_id}'. Use POST /api/skills/generate to create skills."
        formatted = "\n\n---\n\n".join(skills)
        return f"Skills for '{user_id}':\n\n{formatted}"
    except Exception as e:
        return f"Error retrieving skills: {str(e)}"


@mcp.tool()
async def store_knowledge(content: str, source: str, user_id: str) -> str:
    """
    Store a new piece of knowledge into the company memory.
    Old facts are never deleted — they are marked as historical automatically.

    Args:
        content: The knowledge/fact to store.
        source: The source of this knowledge (e.g. 'notion', 'trello', 'manual').
        user_id: The user/organization identifier.
    """
    try:
        result = await store_memory(content=content, source=source, user_id=user_id)
        return (
            f"Knowledge stored successfully.\n"
            f"ID: {result['id']}\n"
            f"Source: {result['source']}\n"
            f"Content: {result['content'][:100]}..."
        )
    except Exception as e:
        return f"Error storing knowledge: {str(e)}"


@mcp.tool()
async def ingest_tool(user_id: str, tool: str, connection_id: str) -> str:
    """
    Trigger data ingestion from a connected tool (notion or trello).
    Fetches all data and extracts facts into company memory.

    Args:
        user_id: The user/organization identifier.
        tool: The tool to ingest from ('notion' or 'trello').
        connection_id: The Nango connection ID for this integration.
    """
    try:
        result = await run_ingestion(
            user_id=user_id,
            tool=tool,
            connection_id=connection_id,
        )
        return (
            f"Ingestion complete for '{tool}'.\n"
            f"Facts stored: {result.get('facts_stored', 0)}\n"
            f"Status: {result.get('status', 'complete')}"
        )
    except Exception as e:
        return f"Error during ingestion of '{tool}': {str(e)}"


def get_mcp_app():
    return mcp.streamable_http_app()
