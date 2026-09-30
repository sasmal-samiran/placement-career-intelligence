import json
from typing import Any, Dict, List, Optional, Union
from schemas.resume import ResumeResponse
from schemas.skill_graph import SkillGapAnalysis

RESUME_EXTRACTION_SYSTEM_PROMPT = f"""You are an expert resume parser. Extract candidate information from the resume and return ONLY a JSON object adhering strictly to this JSON Schema:
{json.dumps(ResumeResponse.model_json_schema())}

Rules:
- Categorize skills strictly into programming_languages, frameworks, databases, tools, cloud, other.
- Use null for missing string fields and [] for empty lists. Valid email format or null for email.
- Output pure JSON only without markdown formatting.
"""

SKILL_GAP_SYSTEM_PROMPT = f"""You are an expert career intelligence and skill knowledge graph engineer.
Analyze candidate skills against the target role/job description, perform skill gap analysis, and generate a directed skill graph adhering strictly to this JSON Schema:
{json.dumps(SkillGapAnalysis.model_json_schema())}

Graph Generation Rules:
1. Nodes:
   - Create nodes for candidate skills with status="acquired".
   - Create nodes for missing skills required or recommended for the role with status="missing" or status="recommended".
   - Set accurate category (programming_languages, frameworks, databases, tools, cloud, other).
2. Edges:
   - Connect related skills with meaningful directed relations: 'prerequisite_of', 'complements', 'subtopic_of', 'requires', 'related_to'.
3. Gap & Learning Path:
   - Identify acquired_skills vs missing_skills, compute readiness_score (0 to 100), and order recommended_learning_path logically by prerequisites.
4. Output pure JSON only without markdown formatting.
"""


def format_resume_extraction_messages(resume_text: str) -> List[Dict[str, str]]:
    return [
        {"role": "system", "content": RESUME_EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": f"Resume Text:\n{resume_text}"},
    ]


def format_skill_gap_messages(
    candidate_skills: Union[List[str], Dict[str, Any]],
    target_role: Optional[str] = None,
    target_job_description: Optional[str] = None,
) -> List[Dict[str, str]]:
    user_payload: Dict[str, Any] = {
        "candidate_skills": candidate_skills,
        "target_role": target_role or "Software Engineer / Relevant Tech Role",
    }
    if target_job_description:
        user_payload["target_job_description"] = target_job_description

    return [
        {"role": "system", "content": SKILL_GAP_SYSTEM_PROMPT},
        {"role": "user", "content": f"Analyze candidate skills and generate skill graph:\n{json.dumps(user_payload, indent=2)}"},
    ]
