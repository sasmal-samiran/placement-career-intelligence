from typing import Dict, List, Optional
from data.questions import SAMPLE_QUESTIONS, get_all_questions
from schemas.assessment import (
    AssessmentQuestion,
    AssessmentResultResponse,
    AssessmentSubmissionRequest,
    CategoryBreakdown,
    DimensionScore,
    QuestionOption,
    RadarChartItem,
    SkillGapItem,
    SkillProfileRequest,
    SkillProfileResponse,
)


class AssessmentService:
    @classmethod
    def get_test_questions(
        cls,
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        limit: int = 20,
    ) -> List[AssessmentQuestion]:
        """
        Returns questions stripped of their correct answers and explanations
        so students can take the test securely.
        """
        filtered = []
        for q in SAMPLE_QUESTIONS:
            if category and q["category"] != category:
                continue
            if difficulty and q["difficulty"] != difficulty:
                continue
            # Strip correct_option_id and explanation for safety
            safe_q = AssessmentQuestion(
                question_id=q["question_id"],
                category=q["category"],
                subtopic=q["subtopic"],
                difficulty=q["difficulty"],
                question_text=q["question_text"],
                options=[QuestionOption(**opt) for opt in q["options"]],
                correct_option_id=None,
                explanation=None,
            )
            filtered.append(safe_q)
            if len(filtered) >= limit:
                break
        return filtered

    @classmethod
    def evaluate_submission(
        cls, submission: AssessmentSubmissionRequest
    ) -> AssessmentResultResponse:
        """
        Grades student submissions, calculates category breakdowns,
        and generates strengths and recommendations.
        """
        q_map = {q["question_id"]: q for q in SAMPLE_QUESTIONS}
        category_stats: Dict[str, Dict[str, int]] = {}

        total_correct = 0
        total_questions = len(submission.answers)

        for ans in submission.answers:
            q_info = q_map.get(ans.question_id)
            if not q_info:
                continue

            cat = q_info["category"]
            if cat not in category_stats:
                category_stats[cat] = {"total": 0, "correct": 0}

            category_stats[cat]["total"] += 1
            is_correct = ans.selected_option_id == q_info["correct_option_id"]
            if is_correct:
                category_stats[cat]["correct"] += 1
                total_correct += 1

        # Calculate category scores
        category_breakdowns: Dict[str, CategoryBreakdown] = {}
        strengths = []
        areas_for_improvement = []

        for cat, stats in category_stats.items():
            tot = stats["total"]
            corr = stats["correct"]
            pct = round((corr / tot) * 100, 1) if tot > 0 else 0.0

            if pct >= 75.0:
                prof = "Advanced"
                strengths.append(f"Strong command over {cat.replace('_', ' ').title()} ({pct}%)")
            elif pct >= 50.0:
                prof = "Intermediate"
            else:
                prof = "Beginner"
                areas_for_improvement.append(
                    f"Needs focused practice in {cat.replace('_', ' ').title()} ({pct}%)"
                )

            category_breakdowns[cat] = CategoryBreakdown(
                total_questions=tot,
                correct_count=corr,
                score_percentage=pct,
                proficiency_level=prof,
            )

        overall_score = (
            round((total_correct / total_questions) * 100, 1) if total_questions > 0 else 0.0
        )

        recommendations = []
        if overall_score < 60.0:
            recommendations.append(
                "Focus on core concepts and daily problem solving before attempting high-tier placement tests."
            )
        else:
            recommendations.append(
                "Good baseline performance! Start timed mock assessments and company-specific past papers."
            )

        return AssessmentResultResponse(
            student_id=submission.student_id,
            test_id=submission.test_id,
            total_score=overall_score,
            category_scores=category_breakdowns,
            strengths=strengths,
            areas_for_improvement=areas_for_improvement,
            recommendations=recommendations,
        )


class SkillProfilingService:
    # Role & Tier Benchmarks (Target Proficiencies out of 100)
    BENCHMARKS = {
        # Tier 1: FAANG / Top Product Companies (Google, Microsoft, Amazon)
        1: {
            "dsa": 85.0,
            "core_cs": 80.0,
            "web_dev": 75.0,
            "aptitude": 85.0,
            "soft_skills": 80.0,
        },
        # Tier 2: Mid-tier Product / Fintech / Established Startups
        2: {
            "dsa": 70.0,
            "core_cs": 70.0,
            "web_dev": 75.0,
            "aptitude": 70.0,
            "soft_skills": 70.0,
        },
        # Tier 3: Service-based / IT Consulting (TCS, Infosys, Wipro, Accenture)
        3: {
            "dsa": 55.0,
            "core_cs": 60.0,
            "web_dev": 60.0,
            "aptitude": 65.0,
            "soft_skills": 65.0,
        },
    }

    @classmethod
    def generate_profile(cls, request: SkillProfileRequest) -> SkillProfileResponse:
        tier = request.target_tier if request.target_tier in (1, 2, 3) else 2
        benchmarks = cls.BENCHMARKS[tier]

        # 1. Compute Dimension Scores from Assessment / External Signals
        scores = request.assessment_scores or {}

        # DSA dimension
        dsa_test = scores.get("dsa", 50.0)
        ext_solved = request.external_profiles.leetcode_solved if request.external_profiles else 0
        dsa_boost = min(ext_solved * 0.15, 25.0)  # Leetcode solved boosts verified score
        final_dsa = min(round(dsa_test * 0.75 + dsa_boost, 1), 100.0)

        # Core CS
        final_core_cs = min(round(scores.get("core_cs", 50.0), 1), 100.0)

        # Web Dev & Frameworks
        web_base = scores.get("web_dev", 50.0)
        resume_boost = 0.0
        if request.resume_skills:
            relevant_skills = {"react", "node", "express", "fastapi", "django", "sql", "docker"}
            claimed = sum(
                1 for s in request.resume_skills if s.lower() in relevant_skills
            )
            resume_boost = min(claimed * 4.0, 20.0)
        final_web = min(round(web_base * 0.8 + resume_boost, 1), 100.0)

        # Aptitude combined (quant + logical + verbal)
        quant = scores.get("aptitude_quantitative", 50.0)
        logic = scores.get("aptitude_logical", 50.0)
        verbal = scores.get("aptitude_verbal", 50.0)
        final_aptitude = min(round((quant + logic + verbal) / 3.0, 1), 100.0)

        # Soft Skills
        final_soft = min(round(scores.get("soft_skills", 60.0), 1), 100.0)

        student_scores = {
            "dsa": final_dsa,
            "core_cs": final_core_cs,
            "web_dev": final_web,
            "aptitude": final_aptitude,
            "soft_skills": final_soft,
        }

        # 2. Dimensions and Status
        dimensions: Dict[str, DimensionScore] = {}
        radar_chart_data: List[RadarChartItem] = []
        skill_gaps: List[SkillGapItem] = []

        weights = {"dsa": 0.30, "core_cs": 0.20, "web_dev": 0.20, "aptitude": 0.20, "soft_skills": 0.10}
        weighted_readiness = 0.0

        for dim, s_score in student_scores.items():
            b_score = benchmarks[dim]
            gap = round(max(0.0, b_score - s_score), 1)

            if s_score >= b_score:
                status = "Mastered" if s_score >= 85.0 else "Proficient"
                feedback = f"Meets or exceeds Tier {tier} requirements."
            elif s_score >= (b_score - 15.0):
                status = "Needs Improvement"
                feedback = f"Slightly below Tier {tier} target ({b_score})."
            else:
                status = "Critical Gap"
                feedback = f"Significantly below target benchmark ({b_score}). Prioritize practice."

            dimensions[dim] = DimensionScore(score=s_score, status=status, feedback=feedback)

            radar_chart_data.append(
                RadarChartItem(
                    metric=dim.replace("_", " ").title(),
                    student_score=s_score,
                    benchmark_score=b_score,
                )
            )

            if gap > 0:
                severity = "High" if gap > 20 else ("Medium" if gap > 10 else "Low")
                skill_gaps.append(
                    SkillGapItem(
                        skill_or_domain=dim.replace("_", " ").title(),
                        current_score=s_score,
                        required_score=b_score,
                        gap=gap,
                        severity=severity,
                        recommendation=f"Dedicate 5-8 hours weekly to improve {dim.replace('_', ' ').title()}.",
                    )
                )

            weighted_readiness += s_score * weights[dim]

        overall_readiness = round(weighted_readiness, 1)

        # 3. Export exact ML features needed by PredictionRequest
        ml_features = {
            "dsa_problems_solved": float(ext_solved) if ext_solved else float(int(final_dsa * 3.5)),
            "aptitude_score": final_aptitude,
            "soft_skills_score": final_soft,
            "competitive_programming_rating": float(
                request.external_profiles.codechef_rating
                if (request.external_profiles and request.external_profiles.codechef_rating)
                else int(final_dsa * 18.0)
            ),
            "linkedIn_profile": 1.0 if (request.external_profiles and request.external_profiles.linkedin_present) else 0.0,
            "college_tier": float(tier),
        }

        return SkillProfileResponse(
            student_id=request.student_id,
            overall_readiness_score=overall_readiness,
            target_role=request.target_role or "Full Stack Developer",
            target_tier=tier,
            dimensions=dimensions,
            radar_chart_data=radar_chart_data,
            skill_gaps=skill_gaps,
            ml_features=ml_features,
        )

