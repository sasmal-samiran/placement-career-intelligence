from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field

from schemas.resume import Skills


class SkillNode(BaseModel):
    id: str
    name: str
    category: str = "other"  # programming_languages, frameworks, databases, tools, cloud, other, domain
    status: Literal["acquired", "missing", "recommended"] = "acquired"
    importance: Literal["core", "required", "recommended", "optional"] = "required"
    description: Optional[str] = None


class SkillEdge(BaseModel):
    source: str
    target: str
    relation: Literal["prerequisite_of", "complements", "subtopic_of", "requires", "related_to"] = "related_to"
    weight: float = 1.0


class SkillGraphData(BaseModel):
    nodes: List[SkillNode] = []
    edges: List[SkillEdge] = []


class SkillGapAnalysis(BaseModel):
    target_role: Optional[str] = None
    readiness_score: float = 0.0  # 0.0 to 100.0
    acquired_skills: List[str] = []
    missing_skills: List[str] = []
    recommended_learning_path: List[str] = []
    graph: SkillGraphData = Field(default_factory=SkillGraphData)
    summary: Optional[str] = None


class SkillGapRequest(BaseModel):
    skills: Union[Skills, List[str], Dict[str, List[str]]]
    target_role: Optional[str] = None
    target_job_description: Optional[str] = None
