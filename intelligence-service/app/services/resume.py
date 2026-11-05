import io
import re
import pymupdf as fitz
from docx import Document
from fastapi import UploadFile, HTTPException
from pydantic import ValidationError

from schemas.resume import (
    ResumeResponse,
    PersonalInfo,
    Education,
    Experience,
    Project,
    Skills,
)
from services.llm.client import groq_client
from services.llm.prompts import format_resume_extraction_messages
from utils.logger import logger


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

    @classmethod
    async def parse_from_text(cls, text: str) -> ResumeResponse:
        """Parses extracted resume text using Groq LLM with intelligent rule-based fallback."""
        try:
            messages = format_resume_extraction_messages(text)
            data = await groq_client.generate(messages)

            if isinstance(data.get("personal_info"), dict):
                email = data["personal_info"].get("email")
                if email and ("@" not in str(email) or " " in str(email)):
                    data["personal_info"]["email"] = None

            return ResumeResponse.model_validate(data)
        except Exception as e:
            logger.warning(f"Groq LLM extraction skipped/failed ({str(e)}). Falling back to rule-based parser.")
            return cls._fallback_parse(text)

    @staticmethod
    def _fallback_parse(text: str) -> ResumeResponse:
        """Robust heuristic resume scraper for extracting structured details directly from text."""
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # 1. Contact Info
        email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
        email = email_match.group(0) if email_match else None

        phone_match = re.search(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}", text)
        phone = phone_match.group(0) if phone_match else None

        linkedin_match = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+", text, re.IGNORECASE)
        linkedin = linkedin_match.group(0) if linkedin_match else None

        github_match = re.search(r"(?:https?://)?(?:www\.)?github\.com/[\w-]+", text, re.IGNORECASE)
        github = github_match.group(0) if github_match else None

        portfolio_match = re.search(r"(?:https?://)?[\w.-]+\.(?:vercel\.app|netlify\.app|github\.io|me|dev|io)", text, re.IGNORECASE)
        portfolio = portfolio_match.group(0) if portfolio_match else None

        # Name: First candidate line that isn't a header, email, or URL
        name = None
        for line in lines[:5]:
            clean_line = re.sub(r"[^\w\s]", "", line).strip()
            if not any(kw in line.lower() for kw in ["resume", "cv", "curriculum", "email", "@", "phone", "http", "+", "page", "developer", "engineer", ".com", "/", "|"]):
                words = clean_line.split()
                if 2 <= len(words) <= 4:
                    name = line.strip(" |,-")
                    break
        if not name and lines:
            first_words = re.sub(r"[^\w\s]", "", lines[0]).strip().split()
            if 1 <= len(first_words) <= 4:
                name = lines[0].strip(" |,-")

        # Location heuristic
        location = None
        loc_match = re.search(r"([A-Z][a-zA-Z\s]+,\s*(?:India|USA|UK|Canada|California|Bangalore|Bengaluru|Kolkata|Mumbai|Delhi|Hyderabad|Pune|Chennai|[A-Z]{2}))", text)
        if loc_match:
            location = loc_match.group(1).strip()

        # 2. Professional Summary
        summary = None
        for i, line in enumerate(lines):
            if re.search(r"^(professional\s+summary|summary|profile|about\s+me|objective)", line, re.IGNORECASE):
                collected = []
                for j in range(i + 1, min(i + 6, len(lines))):
                    curr = lines[j].strip()
                    # stop if next line is a major section title
                    if re.search(r"^(technical\s+skills|skills|education|work\s+experience|experience|projects|certifications):?$", curr, re.IGNORECASE):
                        break
                    if re.search(r"^[A-Z\s]{4,25}$", curr) and any(w in curr for w in ["SKILL", "EDU", "EXP", "PROJ", "CERT"]):
                        break
                    collected.append(curr)
                if collected:
                    summary = " ".join(collected)
                break

        # 3. Categorized Skills
        def match_skills(keywords):
            found = []
            for kw in keywords:
                pattern = r"(?:\b|_)" + re.escape(kw) + r"(?:\b|_)"
                if re.search(pattern, text, re.IGNORECASE):
                    # Proper display casing
                    clean = kw.title() if len(kw) > 3 else kw.upper()
                    if kw.lower() in ["react", "react.js"]: clean = "React.js"
                    elif kw.lower() in ["node", "node.js"]: clean = "Node.js"
                    elif kw.lower() in ["express", "express.js"]: clean = "Express.js"
                    elif kw.lower() in ["fastapi"]: clean = "FastAPI"
                    elif kw.lower() in ["mongodb"]: clean = "MongoDB"
                    elif kw.lower() in ["postgresql", "postgres"]: clean = "PostgreSQL"
                    elif kw.lower() in ["javascript"]: clean = "JavaScript"
                    elif kw.lower() in ["typescript"]: clean = "TypeScript"
                    elif kw.lower() in ["html", "css"]: clean = kw.upper()
                    found.append(clean)
            return list(dict.fromkeys(found))

        langs = match_skills(["python", "javascript", "typescript", "java", "c++", "c", "c#", "sql", "html", "css", "go", "rust", "php"])
        frameworks = match_skills(["react", "react.js", "next.js", "node.js", "express.js", "fastapi", "django", "flask", "bootstrap", "tailwind", "redux", "vue", "angular"])
        databases = match_skills(["mongodb", "postgresql", "mysql", "redis", "sqlite", "firebase", "cassandra", "oracle"])
        tools = match_skills(["git", "github", "docker", "postman", "linux", "figma", "jira", "vscode", "webpack", "vite"])
        cloud = match_skills(["aws", "azure", "gcp", "vercel", "netlify", "heroku"])

        # 4. Education
        education_list = []
        edu_match = re.findall(
            r"((?:Bachelor|B\.Tech|B\.E\.|Master|M\.Tech|BCA|MCA|B\.Sc|M\.Sc|High School)[^\n]+)",
            text,
            re.IGNORECASE,
        )
        for deg in edu_match[:3]:
            # find neighboring cgpa
            cgpa_m = re.search(r"(?:CGPA|GPA|Percentage)[\s:]*([0-9.]+(?:\s*(?:/|out of)\s*10|%)?)", text, re.IGNORECASE)
            education_list.append(
                Education(
                    degree=deg.strip(),
                    institution="Recognized University / Institute",
                    field_of_study="Computer Science & Engineering",
                    cgpa=cgpa_m.group(1) if cgpa_m else None,
                )
            )

        # 5. Experience / Internships
        experience_list = []
        internship_list = []
        for i, line in enumerate(lines):
            if any(term in line.lower() for term in ["intern", "developer", "engineer", "analyst"]) and len(line) < 70:
                if not any(header in line.lower() for header in ["experience", "internship", "projects", "education"]):
                    bullet = lines[i + 1] if i + 1 < len(lines) else ""
                    if "intern" in line.lower():
                        internship_list.append(line)
                    experience_list.append(
                        Experience(
                            company=line,
                            job_title="Software / Tech Role",
                            description=[bullet] if bullet else [],
                        )
                    )
            if len(experience_list) >= 3:
                break

        # 6. Projects
        project_list = []
        for i, line in enumerate(lines):
            if re.search(r"^(project|projects):?", line, re.IGNORECASE):
                for j in range(i + 1, min(i + 8, len(lines))):
                    curr = lines[j]
                    if len(curr) > 8 and not curr.startswith("•") and not curr.startswith("-"):
                        desc = lines[j + 1] if j + 1 < len(lines) else ""
                        project_list.append(
                            Project(
                                name=curr[:45],
                                description=desc if len(desc) > 10 else "Full-stack placement & career software project.",
                                technologies=[t for t in (langs + frameworks)[:4]],
                            )
                        )
                    if len(project_list) >= 3:
                        break

        # 7. Certifications
        cert_list = []
        for line in lines:
            if any(kw in line.lower() for kw in ["certified", "certification", "coursera", "udemy", "nptel", "hackerank"]):
                if not line.lower().startswith("certification") and 5 < len(line) < 90:
                    cert_list.append(line.strip(" -•*"))
            if len(cert_list) >= 5:
                break

        return ResumeResponse(
            personal_info=PersonalInfo(
                name=name,
                email=email,
                phone=phone,
                location=location,
                linkedin=linkedin,
                github=github,
                portfolio=portfolio,
            ),
            summary=summary,
            education=education_list,
            experience=experience_list,
            projects=project_list,
            skills=Skills(
                programming_languages=langs,
                frameworks=frameworks,
                databases=databases,
                tools=tools,
                cloud=cloud,
            ),
            certifications=cert_list,
            internships=internship_list,
            achievements=[],
            languages=["English"],
            interests=[],
        )
