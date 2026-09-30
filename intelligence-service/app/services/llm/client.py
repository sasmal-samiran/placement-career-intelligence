import json
import groq
from groq import AsyncGroq
from fastapi import HTTPException
from config import settings


class GroqClient:
    def __init__(self):
        self._client = None

    @property
    def client(self) -> AsyncGroq:
        if not settings.GROQ_API_KEY:
            raise HTTPException(status_code=401, detail="GROQ_API_KEY is not configured in environment.")
        if self._client is None:
            self._client = AsyncGroq(
                api_key=settings.GROQ_API_KEY,
                max_retries=settings.GROQ_MAX_RETRIES,
                timeout=settings.GROQ_TIMEOUT,
            )
        return self._client

    async def generate(self, messages: list[dict], model: str = None) -> dict:
        try:
            response = await self.client.chat.completions.create(
                model=model or settings.GROQ_MODEL,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=settings.GROQ_TEMPERATURE,
            )
            return json.loads(response.choices[0].message.content)
        except HTTPException:
            raise
        except groq.AuthenticationError:
            raise HTTPException(status_code=401, detail="Invalid Groq API Key.")
        except groq.RateLimitError:
            raise HTTPException(status_code=429, detail="Groq API rate limit exceeded.")
        except groq.GroqError as e:
            raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")
        except (json.JSONDecodeError, TypeError, IndexError):
            raise HTTPException(status_code=502, detail="Failed to parse valid JSON from LLM response.")


groq_client = GroqClient()
