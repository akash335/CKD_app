from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .database import Base, engine
from .models import user, patient, reading, prediction, alert, teleconsultation, notification  # noqa: F401
from .routes.auth import router as auth_router
from .routes.patients import router as patient_router
from .routes.readings import router as reading_router
from .routes.predictions import router as prediction_router
from .routes.alerts import router as alerts_router
from .routes.uploads import router as uploads_router
from .routes.teleconsultations import router as tele_router
from .routes.notifications import router as notification_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CKD Guardian API", version="1.0.0")

frontend_origins = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ckd-guardian.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"message": "CKD Guardian API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(reading_router)
app.include_router(prediction_router)
app.include_router(alerts_router)
app.include_router(uploads_router)
app.include_router(tele_router)
app.include_router(notification_router)