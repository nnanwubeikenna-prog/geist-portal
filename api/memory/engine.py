import os
import uuid
import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from neo4j import AsyncGraphDatabase

_driver = None


def get_neo4j_driver():
    global _driver
    if _driver is None:
        uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
        user = os.environ.get("NEO4J_USERNAME", "neo4j")
        password = os.environ.get("NEO4J_PASSWORD", "password")
        _driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
    return _driver


async def ensure_constraints():
    try:
        driver = get_neo4j_driver()
        async with driver.session() as session:
            await session.run(
                "CREATE CONSTRAINT memory_id IF NOT EXISTS FOR (m:Memory) REQUIRE m.id IS UNIQUE"
            )
    except Exception as e:
        pass


async def store_memory(
    content: str,
    source: str,
    user_id: str,
    is_skill: bool = False,
) -> Dict[str, Any]:
    try:
        driver = get_neo4j_driver()
        timestamp = datetime.now(timezone.utc).isoformat()
        new_id = str(uuid.uuid4())
        snippet = content[:80].lower()

        async with driver.session() as session:
            existing_result = await session.run(
                """
                MATCH (m:Memory)
                WHERE m.user_id = $user_id
                  AND m.is_current = true
                  AND m.source = $source
                  AND (
                      toLower(m.content) CONTAINS $snippet
                      OR $snippet CONTAINS toLower(substring(m.content, 0, 80))
                  )
                RETURN m.id AS id
                LIMIT 1
                """,
                user_id=user_id,
                source=source,
                snippet=snippet,
            )
            existing = await existing_result.single()

            if existing:
                await session.run(
                    "MATCH (m:Memory {id: $id}) SET m.is_current = false",
                    id=existing["id"],
                )

            await session.run(
                """
                CREATE (m:Memory {
                    id: $id,
                    content: $content,
                    source: $source,
                    user_id: $user_id,
                    timestamp: $timestamp,
                    is_current: true,
                    is_skill: $is_skill
                })
                """,
                id=new_id,
                content=content,
                source=source,
                user_id=user_id,
                timestamp=timestamp,
                is_skill=is_skill,
            )

        return {"id": new_id, "content": content, "source": source, "stored": True}
    except Exception as e:
        raise RuntimeError(f"Failed to store memory: {str(e)}") from e


async def fetch_memory(query: str, user_id: str, limit: int = 5) -> List[str]:
    try:
        driver = get_neo4j_driver()
        words = [w.lower() for w in query.split() if len(w) > 3]

        async with driver.session() as session:
            if words:
                result = await session.run(
                    """
                    MATCH (m:Memory)
                    WHERE m.user_id = $user_id AND m.is_current = true
                    WITH m,
                         reduce(score = 0, word IN $words |
                             score + CASE WHEN toLower(m.content) CONTAINS word THEN 1 ELSE 0 END
                         ) AS relevance
                    WHERE relevance > 0
                    RETURN m.content AS content, relevance
                    ORDER BY relevance DESC, m.timestamp DESC
                    LIMIT $limit
                    """,
                    user_id=user_id,
                    words=words,
                    limit=limit,
                )
                records = await result.data()
            else:
                records = []

            if not records:
                result = await session.run(
                    """
                    MATCH (m:Memory)
                    WHERE m.user_id = $user_id AND m.is_current = true
                    RETURN m.content AS content
                    ORDER BY m.timestamp DESC
                    LIMIT $limit
                    """,
                    user_id=user_id,
                    limit=limit,
                )
                records = await result.data()

        return [r["content"] for r in records]
    except Exception as e:
        raise RuntimeError(f"Failed to fetch memory: {str(e)}") from e


async def fetch_all_memory(user_id: str) -> Dict[str, List[Dict]]:
    try:
        driver = get_neo4j_driver()
        async with driver.session() as session:
            result = await session.run(
                """
                MATCH (m:Memory)
                WHERE m.user_id = $user_id
                RETURN m.content AS content,
                       m.source AS source,
                       m.timestamp AS timestamp,
                       m.is_current AS is_current,
                       m.is_skill AS is_skill
                ORDER BY m.source, m.timestamp DESC
                """,
                user_id=user_id,
            )
            records = await result.data()

        grouped: Dict[str, List[Dict]] = {}
        for r in records:
            src = r.get("source") or "unknown"
            if src not in grouped:
                grouped[src] = []
            grouped[src].append(
                {
                    "content": r["content"],
                    "timestamp": r["timestamp"],
                    "is_current": r["is_current"],
                    "is_skill": r["is_skill"],
                }
            )

        return grouped
    except Exception as e:
        raise RuntimeError(f"Failed to fetch all memory: {str(e)}") from e


async def fetch_skills(user_id: str) -> List[str]:
    try:
        driver = get_neo4j_driver()
        async with driver.session() as session:
            result = await session.run(
                """
                MATCH (m:Memory)
                WHERE m.user_id = $user_id
                  AND m.is_skill = true
                  AND m.is_current = true
                RETURN m.content AS content
                ORDER BY m.timestamp DESC
                """,
                user_id=user_id,
            )
            records = await result.data()

        return [r["content"] for r in records]
    except Exception as e:
        raise RuntimeError(f"Failed to fetch skills: {str(e)}") from e


async def semantic_search(query: str, user_id: str, limit: int = 5) -> List[str]:
    try:
        gemini_key = os.environ.get("GEMINI_API_KEY")

        if gemini_key:
            try:
                from langchain_google_genai import GoogleGenerativeAIEmbeddings

                embedder = GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001",
                    google_api_key=gemini_key,
                )

                driver = get_neo4j_driver()
                async with driver.session() as session:
                    result = await session.run(
                        """
                        MATCH (m:Memory)
                        WHERE m.user_id = $user_id AND m.is_current = true
                        RETURN m.content AS content
                        ORDER BY m.timestamp DESC
                        LIMIT 100
                        """,
                        user_id=user_id,
                    )
                    records = await result.data()

                if not records:
                    return []

                contents = [r["content"] for r in records]
                query_embedding = await embedder.aembed_query(query)
                doc_embeddings = await embedder.aembed_documents(contents)

                def cosine_similarity(a: List[float], b: List[float]) -> float:
                    dot = sum(x * y for x, y in zip(a, b))
                    mag_a = math.sqrt(sum(x**2 for x in a))
                    mag_b = math.sqrt(sum(x**2 for x in b))
                    if mag_a == 0 or mag_b == 0:
                        return 0.0
                    return dot / (mag_a * mag_b)

                scored = [
                    (cosine_similarity(query_embedding, emb), content)
                    for emb, content in zip(doc_embeddings, contents)
                ]
                scored.sort(key=lambda x: x[0], reverse=True)
                return [content for _, content in scored[:limit]]
            except Exception:
                pass

        return await fetch_memory(query, user_id, limit)
    except Exception as e:
        raise RuntimeError(f"Failed to perform semantic search: {str(e)}") from e
