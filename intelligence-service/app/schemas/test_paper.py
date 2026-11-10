from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

class TestPaperRequest(BaseModel):
    subject: str
    limit: Optional[int] = 10

class TestPaperResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str
    options: List[str] = Field(min_length=4, max_length=4)
    answer: Literal["A", "B", "C", "D"]


class TestPaperGenerationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    test_paper: List[TestPaperResponse]