from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.routers.course_generation import router as course_generation_router
from backend.routers.health import router as health_router
from backend.routers.resource_generation import router as resource_generation_router


def create_app() -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        version="0.2.0",
        description="EduFlow AI MVP backend",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(health_router)
    application.include_router(course_generation_router)
    application.include_router(resource_generation_router)

    return application


app = create_app()
