import os
from typing import TypedDict, List, Optional

import litellm
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from api.memory.engine import fetch_memory, fetch_skills, store_memory

litellm.suppress_debug_info = True


class ProxyState(TypedDict):
    user_id: str
    message: str
    model: str
    api_key: Optional[str]
    memory_context: List[str]
    enriched_prompt: str
    llm_response: str
    new_facts: List[str]


async def enrich_message_node(state: ProxyState) -> dict:
    try:
        memories = await fetch_memory(state["message"], state["user_id"])
        skills = await fetch_skills(state["user_id"])

        memory_text = (
            "\n".join(f"- {m}" for m in memories)
            if memories
            else "No relevant memories found yet."
        )
        skills_text = (
            "\n".join(f"- {s[:200]}" for s in skills)
            if skills
            else "No skills defined yet."
        )

        enriched = (
            f"COMPANY MEMORY CONTEXT:\n{memory_text}\n\n"
            f"AVAILABLE SKILLS:\n{skills_text}\n\n"
            f"USER MESSAGE:\n{state['message']}\n\n"
            "Use this context to give a response aligned with this company's "
            "knowledge, history, and way of doing things."
        )

        return {"memory_context": memories, "enriched_prompt": enriched}
    except Exception as e:
        return {
            "memory_context": [],
            "enriched_prompt": f"USER MESSAGE:\n{state['message']}",
        }


async def route_to_llm_node(state: ProxyState) -> dict:
    try:
        model = state.get("model") or "gemini/gemini-2.0-flash"
        user_api_key = state.get("api_key")

        if "gemini" in model.lower():
            effective_key = os.environ.get("GEMINI_API_KEY", "")
        elif "anthropic" in model.lower() or "claude" in model.lower():
            effective_key = user_api_key or os.environ.get("ANTHROPIC_API_KEY", "")
        elif "openai" in model.lower() or "gpt" in model.lower():
            effective_key = user_api_key or os.environ.get("OPENAI_API_KEY", "")
        else:
            effective_key = user_api_key or os.environ.get("GEMINI_API_KEY", "")

        messages = [{"role": "user", "content": state["enriched_prompt"]}]

        response = await litellm.acompletion(
            model=model,
            messages=messages,
            api_key=effective_key if effective_key else None,
            temperature=0.7,
        )

        llm_response = response.choices[0].message.content or ""
        return {"llm_response": llm_response}
    except Exception as e:
        return {"llm_response": f"LLM error: {str(e)}"}


async def update_memory_node(state: ProxyState) -> dict:
    try:
        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        if not gemini_key or not state.get("llm_response"):
            return {"new_facts": []}

        gemini = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=gemini_key,
        )

        extract_prompt = (
            "Given this conversation, extract any new facts learned about the company, "
            "its people, products, processes, or decisions. "
            "Only extract genuinely new information as clear single statements. "
            "Return as a numbered list, or return exactly 'NONE' if nothing new.\n\n"
            f"User asked: {state['message']}\n"
            f"Assistant responded: {state['llm_response'][:2000]}"
        )

        response = await gemini.ainvoke([HumanMessage(content=extract_prompt)])
        new_facts: List[str] = []

        if "NONE" not in response.content.upper():
            for line in response.content.strip().splitlines():
                line = line.strip()
                if not line:
                    continue
                if line[0].isdigit() or line.startswith("-") or line.startswith("*"):
                    fact = line.lstrip("0123456789.-*) ").strip()
                    if fact and len(fact) > 10:
                        new_facts.append(fact)
                        try:
                            await store_memory(
                                content=fact,
                                source="conversation",
                                user_id=state["user_id"],
                                is_skill=False,
                            )
                        except Exception:
                            pass

        return {"new_facts": new_facts}
    except Exception:
        return {"new_facts": []}


_proxy_graph = None


def get_proxy_graph():
    global _proxy_graph
    if _proxy_graph is None:
        graph = StateGraph(ProxyState)
        graph.add_node("enrich_message", enrich_message_node)
        graph.add_node("route_to_llm", route_to_llm_node)
        graph.add_node("update_memory", update_memory_node)
        graph.set_entry_point("enrich_message")
        graph.add_edge("enrich_message", "route_to_llm")
        graph.add_edge("route_to_llm", "update_memory")
        graph.add_edge("update_memory", END)
        _proxy_graph = graph.compile()
    return _proxy_graph


async def run_proxy(
    user_id: str,
    message: str,
    model: str,
    api_key: Optional[str] = None,
) -> dict:
    try:
        graph = get_proxy_graph()
        initial_state: ProxyState = {
            "user_id": user_id,
            "message": message,
            "model": model,
            "api_key": api_key,
            "memory_context": [],
            "enriched_prompt": "",
            "llm_response": "",
            "new_facts": [],
        }
        result = await graph.ainvoke(initial_state)
        return {
            "response": result.get("llm_response", ""),
            "memory_context": result.get("memory_context", []),
            "model": model,
            "new_facts_stored": len(result.get("new_facts", [])),
        }
    except Exception as e:
        raise RuntimeError(f"Proxy agent failed: {str(e)}") from e
