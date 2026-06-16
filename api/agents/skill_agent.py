import os
import re
import json
from pathlib import Path
from typing import TypedDict, List, Dict, Any

from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from api.memory.engine import fetch_all_memory, store_memory

SKILLS_DIR = Path(__file__).parent.parent / "skills"


class SkillState(TypedDict):
    user_id: str
    all_memories: Dict[str, List[Dict]]
    skill_groups: List[Dict[str, Any]]
    generated_skills: List[Dict[str, str]]
    saved_files: List[str]


async def scan_memory_node(state: SkillState) -> dict:
    try:
        all_memories = await fetch_all_memory(state["user_id"])

        if not all_memories:
            return {"all_memories": {}, "skill_groups": []}

        all_facts: List[str] = []
        for source, memories in all_memories.items():
            for m in memories:
                if m.get("is_current") and not m.get("is_skill"):
                    all_facts.append(f"[{source}] {m['content']}")

        if not all_facts:
            return {"all_memories": all_memories, "skill_groups": []}

        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        if not gemini_key:
            return {
                "all_memories": all_memories,
                "skill_groups": [{"topic": "General Operations", "facts": all_facts[:20]}],
            }

        gemini = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=gemini_key,
        )

        facts_text = "\n".join(all_facts[:80])
        group_prompt = (
            "Given these facts about a company, group them into 3 to 7 logical topics or domains. "
            'Return a valid JSON array like: [{"topic": "Topic Name", "facts": ["fact1", "fact2"]}]\n'
            "Return only valid JSON with no explanation.\n\n"
            f"Facts:\n{facts_text}"
        )

        try:
            response = await gemini.ainvoke([HumanMessage(content=group_prompt)])
            text = response.content.strip()
            match = re.search(r"\[.*\]", text, re.DOTALL)
            if match:
                skill_groups = json.loads(match.group())
            else:
                skill_groups = [{"topic": "General Operations", "facts": all_facts[:20]}]
        except Exception:
            skill_groups = [{"topic": "General Operations", "facts": all_facts[:20]}]

        return {"all_memories": all_memories, "skill_groups": skill_groups}
    except Exception as e:
        return {"all_memories": {}, "skill_groups": [], "status": f"error: {str(e)}"}


async def extract_skills_node(state: SkillState) -> dict:
    try:
        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        if not gemini_key or not state.get("skill_groups"):
            return {"generated_skills": []}

        gemini = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=gemini_key,
        )
        generated_skills: List[Dict[str, str]] = []

        for group in state["skill_groups"]:
            topic = group.get("topic", "General")
            facts = group.get("facts", [])
            if not facts:
                continue

            facts_text = "\n".join(f"- {f}" for f in facts[:30])
            skill_prompt = (
                f"Based on these facts about how this company operates, "
                f"write an executable skill instruction.\n\n"
                f"Topic: {topic}\nFacts:\n{facts_text}\n\n"
                "Write a skill with exactly these sections:\n"
                "SKILL NAME: [name]\n"
                "DESCRIPTION: [description]\n"
                "TRIGGER CONDITIONS: [when to use this skill]\n"
                "STEP BY STEP:\n1. [step]\n2. [step]\n(etc)\n"
                "EXPECTED OUTPUT: [what this produces]"
            )

            try:
                response = await gemini.ainvoke([HumanMessage(content=skill_prompt)])
                generated_skills.append({"topic": topic, "skill_content": response.content})
            except Exception as e:
                generated_skills.append(
                    {
                        "topic": topic,
                        "skill_content": (
                            f"SKILL NAME: {topic}\n"
                            f"DESCRIPTION: Skill based on {topic} knowledge\n"
                            f"TRIGGER CONDITIONS: When working on {topic.lower()} tasks\n"
                            "STEP BY STEP:\n1. Review available context\n2. Apply relevant knowledge\n"
                            "EXPECTED OUTPUT: Informed action based on company knowledge"
                        ),
                    }
                )

        return {"generated_skills": generated_skills}
    except Exception as e:
        return {"generated_skills": [], "status": f"error: {str(e)}"}


async def store_skills_node(state: SkillState) -> dict:
    try:
        SKILLS_DIR.mkdir(parents=True, exist_ok=True)
        saved_files: List[str] = []

        for skill_data in state.get("generated_skills", []):
            topic = skill_data.get("topic", "unknown")
            content = skill_data.get("skill_content", "")

            try:
                await store_memory(
                    content=content,
                    source="skill_agent",
                    user_id=state["user_id"],
                    is_skill=True,
                )
            except Exception:
                pass

            safe_name = re.sub(r"[^\w\s-]", "", topic).strip().replace(" ", "_").lower()
            filepath = SKILLS_DIR / f"{state['user_id']}_{safe_name}.md"
            filepath.write_text(f"# {topic}\n\n{content}", encoding="utf-8")
            saved_files.append(str(filepath))

        return {"generated_skills": state.get("generated_skills", []), "saved_files": saved_files}
    except Exception as e:
        return {
            "generated_skills": state.get("generated_skills", []),
            "saved_files": [],
            "status": f"error: {str(e)}",
        }


_skill_graph = None


def get_skill_graph():
    global _skill_graph
    if _skill_graph is None:
        graph = StateGraph(SkillState)
        graph.add_node("scan_memory", scan_memory_node)
        graph.add_node("extract_skills", extract_skills_node)
        graph.add_node("store_skills", store_skills_node)
        graph.set_entry_point("scan_memory")
        graph.add_edge("scan_memory", "extract_skills")
        graph.add_edge("extract_skills", "store_skills")
        graph.add_edge("store_skills", END)
        _skill_graph = graph.compile()
    return _skill_graph


async def run_skill_generation(user_id: str) -> dict:
    try:
        graph = get_skill_graph()
        initial_state: SkillState = {
            "user_id": user_id,
            "all_memories": {},
            "skill_groups": [],
            "generated_skills": [],
            "saved_files": [],
        }
        result = await graph.ainvoke(initial_state)
        skills = result.get("generated_skills", [])
        return {
            "skills_generated": len(skills),
            "topics": [s.get("topic", "") for s in skills],
            "saved_files": result.get("saved_files", []),
        }
    except Exception as e:
        raise RuntimeError(f"Skill agent failed: {str(e)}") from e
