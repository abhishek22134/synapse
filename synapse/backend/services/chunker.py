"""
Document chunking service.
Splits long text into overlapping chunks for embedding.
"""
import tiktoken
from typing import List, Dict, Any
import hashlib

ENCODER = tiktoken.get_encoding("cl100k_base")


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
    tokens = ENCODER.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        chunks.append(ENCODER.decode(chunk_tokens))
        if end >= len(tokens):
            break
        start += chunk_size - overlap
    return chunks


def make_chunks(
    text: str,
    metadata: Dict[str, Any],
    source: str,
    chunk_size: int = 512,
    overlap: int = 50,
) -> List[Dict[str, Any]]:
    if not text or not text.strip():
        return []

    text_chunks = chunk_text(text, chunk_size, overlap)
    doc_hash = hashlib.md5((source + metadata.get("url", "") + text[:100]).encode()).hexdigest()[:8]

    return [
        {
            "id":       f"{doc_hash}-chunk-{i}",
            "text":     chunk,
            "metadata": {**metadata, "chunk_index": i, "total_chunks": len(text_chunks)},
        }
        for i, chunk in enumerate(text_chunks)
    ]
