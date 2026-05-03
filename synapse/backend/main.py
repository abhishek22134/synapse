from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import connect, ask
from core.config import settings

app = FastAPI(title="Synapse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(connect.router)
app.include_router(ask.router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "stack": "groq + supabase (free)"}
