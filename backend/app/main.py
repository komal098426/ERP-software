from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from app.db.base import Base
        from app.db.session import engine, SessionLocal
        import app.models  # ensure all models are registered
        Base.metadata.create_all(bind=engine)

        from app.seed import seed_roles_and_permissions, seed_demo_users
        db = SessionLocal()
        try:
            roles = seed_roles_and_permissions(db)
            seed_demo_users(db, roles)
        finally:
            db.close()
        logger.info("Database initialized and seeded successfully.")
    except Exception as exc:
        logger.error(f"Startup database initialization error: {exc}", exc_info=True)
    yield


app = FastAPI(title="ERP & Business Dashboard API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^https://.*\.vercel\.app$|^http://localhost:\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}", "type": type(exc).__name__},
    )


app.include_router(api_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

