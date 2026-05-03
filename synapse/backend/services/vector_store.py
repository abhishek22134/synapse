"""
Vector store — Supabase pgvector (FREE)
Embeddings — sentence-transformers all-MiniLM-L6-v2 (FREE, runs locally)

First-time setup in Supabase:
  1. Go to your Supabase project → SQL Editor
  2. Run the SQL in setup_supabase.sql (provided)
"""
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client
from core.config import settings
from typing import List, Dict, Any
import numpy as np

EMBEDDING_MODEL = "all-MiniLM-L6-v2"   # 384 dims, runs locally, totally free
EMBEDDING_DIMS  = 384

# Lazy-loaded singletons
_model: SentenceTransformer | None = None
_supabase: Client | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print("[Embeddings] Loading sentence-transformer model (first time only)...")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        print("[Embeddings] Model loaded ✅")
    return _model


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.supabase_url, settings.supabase_key)
    return _supabase


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed texts locally using sentence-transformers. 100% free."""
    model = get_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings.tolist()


async def upsert_chunks(chunks: List[Dict[str, Any]], source: str, org_id: str = "default"):
    """Store chunks + embeddings in Supabase."""
    if not chunks:
        return

    supabase = get_supabase()
    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)

    rows = []
    for chunk, embedding in zip(chunks, embeddings):
        rows.append({
            "id":        chunk["id"],
            "org_id":    org_id,
            "source":    source,
            "title":     chunk["metadata"].get("title", ""),
            "url":       chunk["metadata"].get("url", ""),
            "content":   chunk["text"],
            "embedding": embedding,
            "metadata":  chunk["metadata"],
        })

    # Upsert in batches of 50
    batch_size = 50
    for i in range(0, len(rows), batch_size):
        supabase.table("documents").upsert(rows[i : i + batch_size]).execute()


async def search_chunks(query: str, org_id: str = "default", top_k: int | None = None) -> List[Dict]:
    """
    Search for most relevant chunks using cosine similarity via Supabase RPC.
    """
    k = top_k or settings.top_k
    supabase = get_supabase()

    query_embedding = embed_texts([query])[0]

    result = supabase.rpc(
        "match_documents",
        {
            "query_embedding": query_embedding,
            "match_org_id":    org_id,
            "match_count":     k,
        },
    ).execute()

    rows = result.data or []
    return [
        {
            "text":   row["content"],
            "score":  row.get("similarity", 0),
            "source": row.get("source", ""),
            "title":  row.get("title", "Untitled"),
            "url":    row.get("url", ""),
        }
        for row in rows
    ]
