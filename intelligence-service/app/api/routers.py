from typing import List
from fastapi import APIRouter, UploadFile, HTTPException, File
from starlette.concurrency import run_in_threadpool

from schemas.prediction import PredictionRequest, PredictionResponse
from schemas.resume import ResumeResponse
from schemas.test_paper import TestPaperRequest, TestPaperResponse
from schemas.skill_graph import SkillGapAnalysis, SkillGapRequest, SkillGraphData
from services.prediction import PredictionService
from services.resume import ResumeService
from services.skill_graph import SkillGraphService
from services.test_paper import TestPaperService
from schemas.duplicate import DuplicateCheckRequest, DuplicateCheckResponse
from services.duplicate_service import DuplicateDetectionService

router = APIRouter(prefix="/api", tags=["Placement Intelligence"])

@router.post("/placement-prediction", response_model=PredictionResponse, summary="Predict probability to be placed")
async def predict(request: PredictionRequest):
    try:
        result= await PredictionService.predict_placement_probability(request)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid branch"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=e
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

@router.post("/test-paper", response_model=List[TestPaperResponse], summary="Generate questions based on given subject")
async def analyze_skill_gap(request: TestPaperRequest):
    return await TestPaperService.generate(request)

@router.post(
    "/duplicate-check",
    response_model=DuplicateCheckResponse,
    summary="Check a student record for potential duplicates",
)
async def check_duplicate(request: DuplicateCheckRequest) -> DuplicateCheckResponse:
    return await run_in_threadpool(DuplicateDetectionService.check, request)
