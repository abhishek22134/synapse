from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Free AI + Embeddings — Groq (one key for everything!)
    groq_api_key: str

    # Free vector DB — Supabase
    supabase_url: str
    supabase_key: str

    # OAuth
    google_client_id: str
    google_client_secret: str
    slack_client_id: str
    slack_client_secret: str
    slack_signing_secret: str = ""

    frontend_url: str = "http://localhost:3000"

    # Chunking
    chunk_size: int = 512
    chunk_overlap: int = 50
    top_k: int = 5

    class Config:
        env_file = ".env"

settings = Settings()
