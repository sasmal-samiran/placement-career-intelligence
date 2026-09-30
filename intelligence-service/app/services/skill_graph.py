from typing import Any, Dict, List, Optional, Union
from fastapi import HTTPException
from pydantic import ValidationError

from schemas.resume import Skills
from schemas.skill_graph import SkillGapAnalysis, SkillGraphData
from services.llm.client import groq_client
from services.llm.prompts import format_skill_gap_messages


class SkillGraphService:
    @classmethod
    async def analyze_gap(
        cls,
        skills: Union[Skills, List[str], Dict[str, Any]],
        target_role: Optional[str] = None,
        target_job_description: Optional[str] = None,
    ) -> SkillGapAnalysis:
        normalized_skills = cls._normalize_skills(skills)
        if not normalized_skills:
            raise HTTPException(status_code=400, detail="No skills provided for analysis.")

        messages = format_skill_gap_messages(
            candidate_skills=normalized_skills,
            target_role=target_role,
            target_job_description=target_job_description,
        )

        data = await groq_client.generate(messages)
        try:
            return SkillGapAnalysis.model_validate(data)
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=f"Invalid skill gap analysis data: {str(e)}")

    @classmethod
    async def generate_graph(
        cls,
        skills: Union[Skills, List[str], Dict[str, Any]],
    ) -> SkillGraphData:
        analysis = await cls.analyze_gap(skills=skills)
        return analysis.graph

    @staticmethod
    def _normalize_skills(skills: Union[Skills, List[str], Dict[str, Any]]) -> Dict[str, List[str]]:
        if isinstance(skills, Skills):
            data = skills.model_dump()
        elif isinstance(skills, dict):
            data = {k: v for k, v in skills.items() if isinstance(v, list)}
        elif isinstance(skills, list):
            data = {"skills": [str(s).strip() for s in skills if str(s).strip()]}
        else:
            data = {}

        return {k: [s for s in v if str(s).strip()] for k, v in data.items() if any(str(s).strip() for s in v)}


skill_graph_service = SkillGraphService()
