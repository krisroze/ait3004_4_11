from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.verify import router as verify_router

from app.database import engine
from app.models import Transfer

Transfer.__table__.create(bind=engine, checkfirst=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(verify_router)


@app.get("/")
def root():
    return {"message": "Backend is running!"}