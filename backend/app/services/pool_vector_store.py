"""
Pool-specific ChromaDB collections — one per source, isolated from the
existing VectorStoreService (which lives in ./chroma_db).

Pool data lives in ./chroma_pool_db.  Collection names: resumes_{source}.
"""
from datetime import datetime, timezone

import chromadb

from app.services.vector_store import _chunk_text, _get_embeddings

POOL_SOURCES = ["linkedin", "naukri", "indeed", "referrals", "internals"]

_pool_client = chromadb.PersistentClient(path="./chroma_pool_db")


def get_pool_collection(source: str):
    return _pool_client.get_or_create_collection(
        name=f"resumes_{source}",
        metadata={"hnsw:space": "cosine"},
    )


def add_resume_to_pool(source: str, filename: str, resume_text: str) -> None:
    """Embed and upsert resume chunks into the source-specific pool collection."""
    collection = get_pool_collection(source)
    chunks = _chunk_text(resume_text)
    if not chunks:
        return
    embeddings = _get_embeddings(chunks)
    uploaded_at = datetime.now(timezone.utc).isoformat()
    doc_id_prefix = f"{source}:{filename}"
    ids = [f"{doc_id_prefix}_{i}" for i in range(len(chunks))]
    metadatas = [
        {"source": source, "filename": filename, "uploaded_at": uploaded_at}
        for _ in chunks
    ]
    collection.upsert(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)


def query_pool(source: str, jd_text: str, n_results: int = 50) -> list[dict]:
    """
    Return top n_results chunks from the source pool ranked by JD similarity.
    Each item: {id, document, metadata, distance}
    """
    collection = get_pool_collection(source)
    try:
        count = collection.count()
        if count == 0:
            return []
        actual_n = min(n_results, count)
        jd_embedding = _get_embeddings([jd_text])[0]
        results = collection.query(
            query_embeddings=[jd_embedding],
            n_results=actual_n,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return []

    output: list[dict] = []
    if results["documents"]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            output.append({
                "id":       f"{source}:{meta.get('filename', '')}",
                "document": doc,
                "metadata": meta,
                "distance": float(dist),
            })
    return output


def similarity_pct(distance: float) -> float:
    """ChromaDB cosine distance → similarity percentage (0–100)."""
    return max(0.0, (1 - distance / 2) * 100)


def fetch_resume_from_pool(source: str, filename: str) -> str:
    """Reassemble all stored chunks for a filename into a single string."""
    collection = get_pool_collection(source)
    result = collection.get(
        where={"filename": filename},
        include=["documents"],
    )
    return "\n".join(result.get("documents", []))


def get_pool_counts() -> dict[str, int]:
    """Return number of unique resumes per source pool."""
    counts: dict[str, int] = {}
    for source in POOL_SOURCES:
        try:
            collection = get_pool_collection(source)
            result = collection.get(include=["metadatas"])
            unique = {m.get("filename", "") for m in result.get("metadatas", [])}
            unique.discard("")
            counts[source] = len(unique)
        except Exception:
            counts[source] = 0
    return counts
