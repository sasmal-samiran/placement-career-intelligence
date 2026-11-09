from typing import List

from fastapi import HTTPException
from pydantic import ValidationError

from services.llm.client import groq_client
from schemas.test_paper import TestPaperGenerationResponse, TestPaperRequest, TestPaperResponse

QUESTION_GENERATION_PROMPT = """
You are an expert technical assessment question generator for a B.Tech student Placement and Career Guidance System for checking their efficiency of that subject.

Your task is to generate a technical assessment test based on the provided subject or technology.

**Input:**

- Subject: `{subject}`
- Total Number of Questions: `{limit}`

**Question Distribution:**
Distribute questions equally across three difficulty levels:

- Easy: 33.33%
- Medium: 33.33%
- Hard: 33.33%

**Question Generation Guidelines:**

1. Generate original, technically accurate, relevant questions strictly related to the provided subject.
2. Easy questions should assess fundamental concepts, definitions, syntax, and basic understanding.
3. Medium questions should assess practical knowledge, conceptual application, problem-solving, and implementation.
4. Hard questions should assess advanced concepts, debugging, optimization, analytical thinking, and real-world technical scenarios.
5. Avoid duplicate, ambiguous, misleading, or overly theoretical questions.
6. Use a mixture of conceptual, code-based, scenario-based, and practical application questions where appropriate.
7. Each question must have exactly four options.
8. Only one option must be correct from the given options.
9. Ensure incorrect options are plausible but technically incorrect.
10. Do not reveal the correct answer within the question or options.

**Output Requirements:**

Generate exactly the requested number of questions. Each question must have four options
labeled A, B, C, and D, and `answer` must be the correct option label.
The response format is enforced; return question data only.

**Important:**

- Ensure every correct answer is accurate.
- Randomize correct answer positions across A, B, C, and D.
- Do not include introductory text, Markdown formatting, or additional content outside the JSON.
- The questions must evaluate actual technical competency, not merely memorization.

Your objective is to assess whether a student genuinely possesses the claimed technical skill for placement and career recommendations.
"""

class TestPaperService:
    @staticmethod
    async def generate(request: TestPaperRequest) -> List[TestPaperResponse]:
        prompt = QUESTION_GENERATION_PROMPT.format(
            subject=request.subject,
            limit=request.limit,
        )
        messages = [{"role": "user", "content": prompt}]
        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "test_paper",
                "strict": True,
                "schema": TestPaperGenerationResponse.model_json_schema(),
            },
        }

        data = await groq_client.generate(messages, response_format=response_format)
        try:
            response = TestPaperGenerationResponse.model_validate(data)
        except ValidationError as exc:
            raise HTTPException(
                status_code=502,
                detail="The question generator returned data that did not match the required format.",
            ) from exc

        return response.test_paper
