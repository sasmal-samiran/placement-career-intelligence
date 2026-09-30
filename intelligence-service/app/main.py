from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from api.routers import router

app = FastAPI(title= settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(router)

@app.get("/", include_in_schema=False)
def home():
    return {
        'Hello': 'Welcome',
    }