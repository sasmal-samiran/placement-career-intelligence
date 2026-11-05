from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class QuestionOption(BaseModel):
    option_id: str
    text: str


class AssessmentQuestion(BaseModel):
    question_id: str
    category: Literal[
        "dsa",
        "core_cs",
        "web_dev",
        "aptitude_quantitative",
        "aptitude_logical",
        "aptitude_verbal",
        "soft_skills",
    ]
    subtopic: str
    difficulty: Literal["easy", "medium", "hard"]
    question_text: str
    options: List[QuestionOption]
    correct_option_id: Optional[str] = None  # Hidden when sending questions to students
    explanation: Optional[str] = None


class TestConfig(BaseModel):
    test_id: str
    title: str
    description: str
    duration_minutes: int
    category_distribution: Dict[str, int] = Field(
        default_factory=lambda: {
            "dsa": 5,
            "core_cs": 5,
            "web_dev": 5,
            "aptitude_quantitative": 5,
            "aptitude_logical": 5,
            "aptitude_verbal": 5,
            "soft_skills": 5,
        }
    )


class AnswerSubmission(BaseModel):
    question_id: str
    selected_option_id: str
    time_taken_seconds: Optional[int] = 0


class AssessmentSubmissionRequest(BaseModel):
    student_id: str
    test_id: str
    answers: List[AnswerSubmission]


class CategoryBreakdown(BaseModel):
    total_questions: int
    correct_count: int
    score_percentage: float
    proficiency_level: Literal["Beginner", "Intermediate", "Advanced"]


class AssessmentResultResponse(BaseModel):
    student_id: str
    test_id: str
    total_score: float  # 0 to 100
    category_scores: Dict[str, CategoryBreakdown]
    strengths: List[str]
    areas_for_improvement: List[str]
    recommendations: List[str]


# --- Skill Profiling Models ---

class ExternalProfiles(BaseModel):
    leetcode_solved: Optional[int] = 0
    codechef_rating: Optional[int] = 0
    github_repos_count: Optional[int] = 0
    linkedin_present: Optional[bool] = False


class SkillProfileRequest(BaseModel):
    student_id: str
    assessment_scores: Optional[Dict[str, float]] = None  # category -> percentage (0-100)
    resume_skills: Optional[List[str]] = None
    external_profiles: Optional[ExternalProfiles] = None
    target_role: Optional[str] = "Full Stack Developer"
    target_tier: Optional[int] = 2  # 1 (Product/FAANG), 2 (Mid-tier/Product), 3 (Service)


class DimensionScore(BaseModel):
    score: float  # 0 - 100
    status: Literal["Critical Gap", "Needs Improvement", "Proficient", "Mastered"]
    feedback: str


class RadarChartItem(BaseModel):
    metric: str
    student_score: float
    benchmark_score: float


class SkillGapItem(BaseModel):
    skill_or_domain: str
    current_score: float
    required_score: float
    gap: float
    severity: Literal["High", "Medium", "Low"]
    recommendation: str


class SkillProfileResponse(BaseModel):
    student_id: str
    overall_readiness_score: float  # 0 to 100
    target_role: str
    target_tier: int
    dimensions: Dict[str, DimensionScore]  # dsa, core_cs, web_dev, aptitude, soft_skills
    radar_chart_data: List[RadarChartItem]
    skill_gaps: List[SkillGapItem]
    ml_features: Dict[str, float]  # Exact features matching PredictionRequest for AI Service

