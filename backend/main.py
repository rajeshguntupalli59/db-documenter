from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import schema

app = FastAPI(title="DB Documenter", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(schema.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
