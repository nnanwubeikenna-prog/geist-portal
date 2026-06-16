from fastapi import APIRouter, Query

from api.memory.engine import fetch_memory, fetch_all_memory, semantic_search

router = APIRouter()


@router.get("/memory")
async def get_memory(
    user_id: str = Query(..., description="User ID"),
    query: str = Query(..., description="Search query"),
    limit: int = Query(5, description="Max results"),
):
    try:
        memories = await fetch_memory(query, user_id, limit=limit)
        return {
            "memories": memories,
            "query": query,
            "user_id": user_id,
            "count": len(memories),
        }
    except Exception as e:
        return {"error": str(e), "memories": [], "query": query, "user_id": user_id}


@router.get("/memory/all")
async def get_all_memory(
    user_id: str = Query(..., description="User ID"),
):
    try:
        memories = await fetch_all_memory(user_id)
        total = sum(len(v) for v in memories.values())
        return {
            "memories": memories,
            "user_id": user_id,
            "total_facts": total,
            "sources": list(memories.keys()),
        }
    except Exception as e:
        return {"error": str(e), "memories": {}, "user_id": user_id}


@router.get("/memory/search")
async def search_memory(
    user_id: str = Query(..., description="User ID"),
    query: str = Query(..., description="Semantic search query"),
    limit: int = Query(5, description="Max results"),
):
    try:
        results = await semantic_search(query, user_id, limit=limit)
        return {
            "results": results,
            "query": query,
            "user_id": user_id,
            "count": len(results),
        }
    except Exception as e:
        return {"error": str(e), "results": [], "query": query, "user_id": user_id}
