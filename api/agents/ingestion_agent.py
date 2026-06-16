import os
from typing import TypedDict, List

from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from api.tools.nango import fetch_notion_pages, fetch_trello_cards
from api.memory.engine import store_memory


class IngestionState(TypedDict):
    user_id: str
    connection_id: str
    tool: str
    raw_data: List[dict]
    extracted_facts: List[str]
    status: str


async def fetch_data_node(state: IngestionState) -> dict:
    try:
        tool = state["tool"]
        user_id = state["user_id"]
        connection_id = state["connection_id"]

        if tool == "notion":
            raw_data = await fetch_notion_pages(user_id, connection_id)
        elif tool == "trello":
            raw_data = await fetch_trello_cards(user_id, connection_id)
        else:
            raw_data = []

        return {"raw_data": raw_data, "status": "fetched"}
    except Exception as e:
        return {"raw_data": [], "status": f"fetch_error: {str(e)}"}


async def extract_facts_node(state: IngestionState) -> dict:
    try:
        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        extracted_facts: List[str] = []

        if not gemini_key:
            for item in state["raw_data"]:
                title = item.get("title") or item.get("name") or ""
                if title:
                    extracted_facts.append(f"Item exists titled: {title}")
            return {"extracted_facts": extracted_facts, "status": "extracted_without_llm"}

        gemini = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=gemini_key,
        )

        for item in state["raw_data"]:
            title = item.get("title") or item.get("name") or ""
            body = item.get("content") or item.get("description") or ""
            full_text = f"Title: {title}\n{body}".strip()

            if not full_text or full_text == "Title:":
                continue

            prompt = (
                "Extract all important facts decisions and knowledge from this content. "
                "Each fact must be a single clear statement. Return as numbered list.\n\n"
                f"Content:\n{full_text[:4000]}"
            )

            try:
                response = await gemini.ainvoke([HumanMessage(content=prompt)])
                for line in response.content.strip().splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    if line[0].isdigit() or line.startswith("-") or line.startswith("*"):
                        fact = line.lstrip("0123456789.-*) ").strip()
                        if fact and len(fact) > 10:
                            extracted_facts.append(fact)
            except Exception:
                if title:
                    extracted_facts.append(f"Document titled '{title}' exists in {state['tool']}")

        return {"extracted_facts": extracted_facts, "status": "extracted"}
    except Exception as e:
        return {"extracted_facts": [], "status": f"extract_error: {str(e)}"}


async def store_facts_node(state: IngestionState) -> dict:
    try:
        stored_count = 0
        for fact in state["extracted_facts"]:
            try:
                await store_memory(
                    content=fact,
                    source=state["tool"],
                    user_id=state["user_id"],
                    is_skill=False,
                )
                stored_count += 1
            except Exception:
                continue

        return {"status": f"stored_{stored_count}_facts"}
    except Exception as e:
        return {"status": f"store_error: {str(e)}"}


_ingestion_graph = None


def get_ingestion_graph():
    global _ingestion_graph
    if _ingestion_graph is None:
        graph = StateGraph(IngestionState)
        graph.add_node("fetch_data", fetch_data_node)
        graph.add_node("extract_facts", extract_facts_node)
        graph.add_node("store_facts", store_facts_node)
        graph.set_entry_point("fetch_data")
        graph.add_edge("fetch_data", "extract_facts")
        graph.add_edge("extract_facts", "store_facts")
        graph.add_edge("store_facts", END)
        _ingestion_graph = graph.compile()
    return _ingestion_graph


async def run_ingestion(user_id: str, tool: str, connection_id: str) -> dict:
    try:
        graph = get_ingestion_graph()
        initial_state: IngestionState = {
            "user_id": user_id,
            "connection_id": connection_id,
            "tool": tool,
            "raw_data": [],
            "extracted_facts": [],
            "status": "starting",
        }
        result = await graph.ainvoke(initial_state)
        return {
            "status": result.get("status", "complete"),
            "facts_stored": len(result.get("extracted_facts", [])),
            "tool": tool,
        }
    except Exception as e:
        raise RuntimeError(f"Ingestion agent failed: {str(e)}") from e
