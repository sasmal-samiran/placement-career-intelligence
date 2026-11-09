# placement-career-intelligence
AI-powered student placement intelligence and personalized career guidance system with ML-based predictions, recommendations, RAG, and intelligent career assistance.

## MERN application

The web application is in `Mern/app26` and its Express/MongoDB API is in `server`.

## Placement prediction

The Placement Prediction page posts to the authenticated Express endpoint at
`POST /api/placement`. Express builds the model input from the signed-in student's
profile and saved career records, then calls the FastAPI model at
`POST /api/placement-prediction`. The result and profile-based readiness factors
are saved in MongoDB and returned to React for display.

Run the FastAPI app from `intelligence-service/app` on port `8000` as well as
the Express API and React app:

```powershell
uvicorn main:app --reload --port 8000
```

Express uses `INTELLIGENCE_SERVICE_URL` to locate the FastAPI service; it
defaults to `http://localhost:8000`. The FastAPI app also requires the settings
in `intelligence-service/.env`.
