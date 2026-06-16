from fastapi import APIRouter, Query
from pydantic import BaseModel

from api.memory.engine import fetch_skills
from api.agents.skill_agent import run_skill_generation

router = APIRouter()


class GenerateSkillsRequest(BaseModel):
    user_id: str


@router.get("/skills")
async def get_skills(
    user_id: str = Query(..., description="User ID"),
):
    try:
        skills = await fetch_skills(user_id)
        return {
            "skills": skills,
            "user_id": user_id,
            "count": len(skills),
        }
    except Exception as e:
        return {"error": str(e), "skills": [], "user_id": user_id}


@router.post("/skills/generate")
async def generate_skills(request: GenerateSkillsRequest):
    try:
        result = await run_skill_generation(request.user_id)
        return {
            "status": "success",
            "skills_generated": result["skills_generated"],
            "topics": result["topics"],
            "saved_files": result["saved_files"],
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "skills_generated": 0,
            "topics": [],
            "saved_files": [],
        }
