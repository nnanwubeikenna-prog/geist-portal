from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from api.agents.proxy_agent import run_proxy

router = APIRouter()


class ChatRequest(BaseModel):
    user_id: str
    message: str
    model: str = "gemini/gemini-2.0-flash"
    api_key: Optional[str] = None


@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        result = await run_proxy(
            user_id=request.user_id,
            message=request.message,
            model=request.model,
            api_key=request.api_key,
        )
        return {
            "response": result["response"],
            "memory_context": result["memory_context"],
            "model": result["model"],
            "new_facts_stored": result.get("new_facts_stored", 0),
        }
    except Exception as e:
        return {
            "error": str(e),
            "response": "",
            "memory_context": [],
            "model": request.model,
        }
