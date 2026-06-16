import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.chat import router as chat_router
from api.routes.connect import router as connect_router
from api.routes.memory import router as memory_router
from api.routes.skills import router as skills_router

app = FastAPI(
    title="Company Brain",
    description="Autonomous organizational memory OS — temporal knowledge graph with LLM proxy and MCP.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(connect_router, prefix="/api")
app.include_router(memory_router, prefix="/api")
app.include_router(skills_router, prefix="/api")

try:
    from api.mcp.server import get_mcp_app

    mcp_asgi = get_mcp_app()
    app.mount("/mcp", mcp_asgi)
except Exception as _mcp_err:
    pass


@app.get("/api/health")
async def health():
    services: dict = {}

    neo4j_uri = os.environ.get("NEO4J_URI")
    if neo4j_uri:
        try:
            from api.memory.engine import get_neo4j_driver, ensure_constraints

            driver = get_neo4j_driver()
            async with driver.session() as session:
                await session.run("RETURN 1 AS ok")
            await ensure_constraints()
            services["neo4j"] = "connected"
        except Exception as e:
            services["neo4j"] = f"configured_but_unreachable: {str(e)[:80]}"
    else:
        services["neo4j"] = "not_configured"

    services["nango"] = (
        "configured" if os.environ.get("NANGO_SECRET_KEY") else "not_configured"
    )
    services["gemini"] = (
        "configured" if os.environ.get("GEMINI_API_KEY") else "not_configured"
    )

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    if supabase_url and supabase_key:
        services["supabase"] = "configured"
    else:
        services["supabase"] = "not_configured"

    return {"status": "ok", "services": services}


if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
