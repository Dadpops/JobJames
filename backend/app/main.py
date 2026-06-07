import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router
from app.config import settings
from app.database import init_db
from app.services import scheduler

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await asyncio.wait_for(init_db(), timeout=30.0)
        await scheduler.start()
    except asyncio.TimeoutError:
        log.error("init_db() timed out after 30s — app starting without DB initialization")
    except Exception as exc:
        log.error("Startup error (non-fatal): %s", exc, exc_info=True)
    yield
    try:
        scheduler.scheduler.shutdown(wait=False)
    except Exception:
        pass


app = FastAPI(title="JobJames API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
