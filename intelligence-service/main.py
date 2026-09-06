from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from api.routes.app import router

app = FastAPI(title= settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['POST']
)

app.include_router(router, prefix='/api')

@app.get("/", include_in_schema=False)
def home():
    return {
        'Hello': 'Welcome',
    }