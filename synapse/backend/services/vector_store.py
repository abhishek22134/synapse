"""
Vector store — Supabase pgvector (FREE)
Embeddings — TF-IDF style hashing (pure Python, no API, no torch, no RAM issues)

This uses a deterministic hash-based embedding that:
- Runs 100% locally with zero dependencies
- Uses zero RAM beyond basic Python
- Works instantly with no API calls
- Good enough for keyword + semantic matching on company docs
"""
import hashlib
import math
import re
from supabase import create_client, Client
from core.config import settings
from typing import List, Dict, Any

EMBEDDING_DIMS = 512   # Must match Supabase schema
_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.supabase_url, settings.supabase_key)
    return _supabase


def _tokenize(text: str) -> List[str]:
    """Simple word tokenizer."""
    text = text.lower()
    tokens = re.findall(r'\b[a-z0-9]+\b', text)
    # Add bigrams for better semantic matching
    bigrams = [f"{tokens[i]}_{tokens[i+1]}" for i in range(len(tokens)-1)]
    return tokens + bigrams


def embed_text(text: str) -> List[float]:
    """
    Hash-based embedding (feature hashing / hashing trick).
    Deterministic, fast, no external calls needed.
    Maps text tokens into a fixed-size float vector.
    """
    vec = [0.0] * EMBEDDING_DIMS
    tokens = _tokenize(text)

    if not tokens:
        return vec

    for token in tokens:
        # Use MD5 hash to get a stable bucket index
        h = int(hashlib.md5(token.encode()).hexdigest(), 16)
        idx = h % EMBEDDING_DIMS
        # Sign from second hash for unbiased estimation
        h2 = int(hashlib.sha1(token.encode()).hexdigest(), 16)
        sign = 1.0 if h2 % 2 == 0 else -1.0
        vec[idx] += sign

    # L2 normalize
    magnitude = math.sqrt(sum(x * x for x in vec))
    if magnitude > 0:
        vec = [x / magnitude for x in vec]

    return vec


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts. Fully synchronous, no API needed."""
    return [embed_text(t) for t in texts]


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

    for i in range(0, len(rows), 50):
        supabase.table("documents").upsert(rows[i : i + 50]).execute()


async def search_chunks(query: str, org_id: str = "default", top_k: int | None = None) -> List[Dict]:
    """Search for most relevant chunks via Supabase pgvector."""
    k = top_k or settings.top_k
    supabase = get_supabase()

    query_embedding = embed_text(query)

    result = supabase.rpc(
        "match_documents",
        {
            "query_embedding": query_embedding,
            "match_org_id":    org_id,
            "match_count":     k,
        },
    ).execute()

    return [
        {
            "text":   row["content"],
            "score":  row.get("similarity", 0),
            "source": row.get("source", ""),
            "title":  row.get("title", "Untitled"),
            "url":    row.get("url", ""),
        }
        for row in (result.data or [])
    ]
