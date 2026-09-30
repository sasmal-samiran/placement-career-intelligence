from typing import Optional
from fastapi import APIRouter, UploadFile, HTTPException, File, Form

from schemas.prediction import PredictionRequest, PredictionResponse
from schemas.resume import ResumeResponse
from schemas.skill_graph import SkillGapAnalysis, SkillGapRequest, SkillGraphData
from services.prediction import PredictionService
from services.resume import ResumeService
from services.skill_graph import SkillGraphService

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


# @router.post("/skill-gap/from-resume", response_model=SkillGapAnalysis, summary="Analyze skill gap directly from uploaded resume")
# async def analyze_skill_gap_from_resume(
#     file: UploadFile = File(...),
#     target_role: Optional[str] = Form(None),
#     target_job_description: Optional[str] = Form(None),
# ):
#     """
#     Upload a resume and specify a target role to perform both resume parsing
#     and skill gap graph analysis in a single request.
#     """
#     resume_data: ResumeResponse = await ResumeService.parse(file)
#     return await SkillGraphService.analyze_gap(
#         skills=resume_data.skills,
#         target_role=target_role,
#         target_job_description=target_job_description,
#     )


# @router.post("/skill-graph", response_model=SkillGraphData, summary="Generate skill graph for candidate skills")
# async def generate_skill_graph(request: SkillGapRequest):
#     """
#     Generates an interconnected skill knowledge graph (nodes + edges) for the provided skills.
#     """
#     return await SkillGraphService.generate_graph(skills=request.skills)