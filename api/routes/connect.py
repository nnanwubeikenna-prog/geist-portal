from fastapi import APIRouter
from pydantic import BaseModel

from api.agents.ingestion_agent import run_ingestion

router = APIRouter()


class ConnectRequest(BaseModel):
    user_id: str
    tool: str
    connection_id: str


@router.post("/connect")
async def connect(request: ConnectRequest):
    try:
        result = await run_ingestion(
            user_id=request.user_id,
            tool=request.tool,
            connection_id=request.connection_id,
        )
        return {
            "status": "success",
            "message": f"Ingestion complete for {request.tool}",
            "facts_stored": result.get("facts_stored", 0),
            "tool": request.tool,
            "details": result.get("status", ""),
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "facts_stored": 0,
            "tool": request.tool,
        }
