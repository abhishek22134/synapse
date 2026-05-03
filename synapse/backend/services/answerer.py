"""
Answer generation — Groq API (FREE)
Uses llama-3.1-8b-instant — fast and free on Groq's free tier.
"""
from groq import Groq
from services.vector_store import search_chunks
from core.config import settings
from typing import Dict, Any, List

GROQ_MODEL = "llama-3.1-8b-instant"   # Free, very fast (~300 tokens/sec)

_groq_client: Groq | None = None

def get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=settings.groq_api_key)
    return _groq_client


SYSTEM_PROMPT = """You are Synapse, an enterprise AI assistant that answers questions using only the provided company knowledge.

Rules:
1. Answer ONLY from the context provided below. Do not use outside knowledge.
2. Always cite sources inline using [Source: Title] format.
3. If the context doesn't contain the answer, say exactly: "I couldn't find relevant information for this in the connected sources."
4. Be concise and direct. Use bullet points for lists.
5. Never make up information."""


def format_context(chunks: List[Dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        title  = chunk.get("title", "Unknown")
        url    = chunk.get("url", "")
        source = chunk.get("source", "")
        header = f"[{i}] {title} ({source})"
        if url:
            header += f" — {url}"
        parts.append(f"{header}\n{chunk['text']}")
    return "\n\n---\n\n".join(parts)


async def answer_question(question: str, org_id: str = "default") -> Dict[str, Any]:
    """Full RAG pipeline using Groq (free)."""

    # 1. Retrieve relevant chunks
    chunks = await search_chunks(question, org_id=org_id)

    if not chunks:
        return {
            "answer": "I couldn't find relevant information for this in the connected sources.",
            "sources": [],
            "chunks_used": 0,
        }

    # 2. Build context
    context = format_context(chunks)

    # 3. Generate answer with Groq (free)
    client = get_groq()
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Context:\n\n{context}\n\n---\n\nQuestion: {question}\n\nAnswer:",
            },
        ],
        temperature=0.2,
        max_tokens=1024,
    )

    answer = response.choices[0].message.content.strip()

    # 4. Deduplicate sources
    seen = set()
    sources = []
    for chunk in chunks:
        key = chunk.get("url") or chunk.get("title")
        if key and key not in seen:
            seen.add(key)
            sources.append({
                "title":  chunk.get("title", "Untitled"),
                "url":    chunk.get("url", ""),
                "source": chunk.get("source", ""),
                "score":  round(chunk.get("score", 0), 3),
            })

    return {
        "answer":      answer,
        "sources":     sources,
        "chunks_used": len(chunks),
    }
