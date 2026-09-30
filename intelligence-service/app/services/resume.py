import io
import pymupdf as fitz
from docx import Document
from fastapi import UploadFile, HTTPException
from pydantic import ValidationError

from schemas.resume import ResumeResponse
from services.llm.client import groq_client
from services.llm.prompts import format_resume_extraction_messages


class ResumeService:
    @staticmethod
    async def extract_text(file: UploadFile) -> str:
        """Extracts text content from PDF, DOCX, or TXT uploads."""
        filename = (file.filename or "").lower()
        contents = await file.read()

        try:
            if filename.endswith(".pdf"):
                doc = fitz.open(stream=contents, filetype="pdf")
                return "\n".join(page.get_text() for page in doc).strip()
            elif filename.endswith(".docx"):
                doc = Document(io.BytesIO(contents))
                return "\n".join(p.text for p in doc.paragraphs if p.text).strip()
            elif filename.endswith(".txt"):
                return contents.decode("utf-8", errors="ignore").strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read file '{file.filename}': {str(e)}")

        raise HTTPException(status_code=400, detail="Unsupported format. Upload PDF, DOCX, or TXT.")

    @classmethod
    async def parse(cls, file: UploadFile) -> ResumeResponse:
        """Extracts text from an uploaded resume and parses it into ResumeResponse."""
        text = await cls.extract_text(file)
        if not text:
            raise HTTPException(status_code=400, detail="Uploaded file contains no readable text.")
        return await cls.parse_from_text(text)

    @staticmethod
    async def parse_from_text(text: str) -> ResumeResponse:
        """Parses extracted resume text using Groq LLM into ResumeResponse."""
        messages = format_resume_extraction_messages(text)
        data = await groq_client.generate(messages)

        if isinstance(data.get("personal_info"), dict):
            email = data["personal_info"].get("email")
            if email and ("@" not in str(email) or " " in str(email)):
                data["personal_info"]["email"] = None

        try:
            return ResumeResponse.model_validate(data)
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=f"Invalid resume data structure: {str(e)}")
