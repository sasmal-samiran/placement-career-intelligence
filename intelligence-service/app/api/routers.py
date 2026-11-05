from typing import List, Optional
from fastapi import APIRouter, UploadFile, HTTPException, File, Form, Query

from schemas.prediction import PredictionRequest, PredictionResponse
from schemas.resume import ResumeResponse
from schemas.skill_graph import SkillGapAnalysis, SkillGapRequest, SkillGraphData
from schemas.assessment import (
    AssessmentQuestion,
    AssessmentResultResponse,
    AssessmentSubmissionRequest,
    SkillProfileRequest,
    SkillProfileResponse,
)
from services.prediction import PredictionService
from services.resume import ResumeService
from services.skill_graph import SkillGraphService
from services.assessment import AssessmentService, SkillProfilingService

router = APIRouter(prefix="/api", tags=["Placement Intelligence"])


# ==========================================
# Student Assessment & Skill Profiling APIs
# ==========================================

@router.get(
    "/assessment/questions",
    response_model=List[AssessmentQuestion],
    summary="Get questions for student assessment (answers omitted)",
)
async def get_assessment_questions(
    category: Optional[str] = Query(None, description="Category filter (dsa, core_cs, web_dev, aptitude_quantitative, etc.)"),
    difficulty: Optional[str] = Query(None, description="Difficulty filter (easy, medium, hard)"),
    limit: int = Query(20, ge=1, le=50, description="Max questions to return"),
):
    """
    Retrieve questions for student evaluation tests.
    Correct answers and internal explanations are automatically omitted for test security.
    """
    return AssessmentService.get_test_questions(category=category, difficulty=difficulty, limit=limit)


@router.post(
    "/assessment/submit",
    response_model=AssessmentResultResponse,
    summary="Evaluate submitted assessment answers",
)
async def submit_assessment(submission: AssessmentSubmissionRequest):
    """
    Submit test answers. Returns overall percentage, category-level breakdown,
    strengths, and targeted areas for improvement.
    """
    return AssessmentService.evaluate_submission(submission)


@router.post(
    "/skills/profile",
    response_model=SkillProfileResponse,
    summary="Generate comprehensive Skill Profile and Radar Chart data",
)
async def generate_skill_profile(request: SkillProfileRequest):
    """
    Aggregates assessment results, claimed resume skills, and external profiles (LeetCode/CodeChef)
    to generate:
    - 5-dimensional skill rating (DSA, Core CS, Web Dev, Aptitude, Soft Skills)
    - Radar Chart data ready for frontend visualization
    - Skill gap analysis mapped against company tiers (Tier 1/2/3)
    - Downstream ML features required by the Placement Prediction model
    """
    return SkillProfilingService.generate_profile(request)


# ==========================================
# Placement Prediction & Resume APIs
# ==========================================

@router.post("/placement-prediction", response_model=PredictionResponse, summary="Predict probability to be placed")
async def predict(request: PredictionRequest):
    try:
        result = await PredictionService.predict_placement_probability(request)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid branch"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    return result


@router.post("/parse-resume", response_model=ResumeResponse, summary="Extract candidate information from resume")
async def parse_resume(file: UploadFile = File(...)):
    """
    Upload a resume (.pdf, .docx, .txt) to extract structured candidate profile.
    """
    return await ResumeService.parse(file)


@router.post("/skill-gap", response_model=SkillGapAnalysis, summary="Analyze skill gap and generate skill graph")
async def analyze_skill_gap(request: SkillGapRequest):
    """
    Provide candidate skills and a target role / job description to receive:
    - Skill gap analysis (acquired vs missing skills)
    - Readiness score (0-100%)
    - Prerequisite-ordered learning path
    - Directed skill knowledge graph (nodes and edges)
    """
    return await SkillGraphService.analyze_gap(
        skills=request.skills,
        target_role=request.target_role,
        target_job_description=request.target_job_description,
    )
