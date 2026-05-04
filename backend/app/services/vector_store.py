import os
from datetime import datetime, timezone
from typing import List

import PyPDF2
from openai import OpenAI
import chromadb

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="resumes",
    metadata={"hnsw:space": "cosine"},
)


def _extract_text_from_pdf(file_path: str) -> str:
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        text = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(text)


def _chunk_text(text: str, chunk_size: int = 1000) -> List[str]:
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


def _get_embeddings(texts: List[str]) -> List[List[float]]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [item.embedding for item in response.data]


class VectorStoreService:
    @staticmethod
    def process_and_store_resumes(file_paths: List[str], job_id: int | None = None):
        """Ingest PDF resumes into ChromaDB. job_id is attached to metadata when provided."""
        for path in file_paths:
            text = _extract_text_from_pdf(path)
            chunks = _chunk_text(text)
            embeddings = _get_embeddings(chunks)

            filename = os.path.basename(path)
            uploaded_at = datetime.now(timezone.utc).isoformat()
            ids = [f"{filename}_{i}" for i in range(len(chunks))]
            metadatas: List[dict] = []
            for _ in chunks:
                meta: dict = {"source": filename, "uploaded_at": uploaded_at}
                if job_id is not None:
                    meta["job_id"] = job_id
                    meta["filename"] = filename
                metadatas.append(meta)

            collection.upsert(
                ids=ids,
                documents=chunks,
                embeddings=embeddings,
                metadatas=metadatas,
            )

    @staticmethod
    def store_text_resume(text: str, filename: str, job_id: int) -> None:
        """
        Ingest a plain-text resume (from non-PDF sources) into ChromaDB with
        per-job metadata so it can later be retrieved with a job_id filter.
        """
        chunks = _chunk_text(text)
        if not chunks:
            return
        embeddings = _get_embeddings(chunks)
        uploaded_at = datetime.now(timezone.utc).isoformat()
        ids = [f"job{job_id}_{filename}_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "source":      filename,
                "filename":    filename,
                "job_id":      job_id,
                "uploaded_at": uploaded_at,
            }
            for _ in chunks
        ]
        collection.upsert(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    @staticmethod
    def find_best_matches(
        job_description: str,
        top_n: int = 5,
        job_id: int | None = None,
    ) -> List[dict]:
        """
        Vector-similarity search over the resume collection.
        When job_id is provided the query is scoped to that job's resumes only.
        """
        jd_embedding = _get_embeddings([job_description])[0]

        query_kwargs: dict = {
            "query_embeddings": [jd_embedding],
            "n_results":        top_n * 4,
            "include":          ["documents", "metadatas", "distances"],
        }
        if job_id is not None:
            query_kwargs["where"] = {"job_id": job_id}

        try:
            results = collection.query(**query_kwargs)
        except Exception:
            return []

        seen_sources: set = set()
        matches: List[dict] = []
        if results["documents"]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                source = meta.get("source")
                if source not in seen_sources:
                    seen_sources.add(source)
                    matches.append({
                        "source":  source,
                        "snippet": doc[:200] + "...",
                        "score":   round(1 - float(dist), 4),
                    })
                if len(matches) >= top_n:
                    break
        return matches

    @staticmethod
    def patch_job_metadata(filename: str, job_id: int) -> None:
        """Back-fill job_id + filename onto existing ChromaDB chunks that lack it.

        Called after /candidates/match scores a PDF resume so future job-scoped
        queries (where={"job_id": job_id}) can find these documents.
        """
        result = collection.get(
            where={"source": filename},
            include=["metadatas"],
        )
        if not result["ids"]:
            return
        updated = [
            {**meta, "job_id": job_id, "filename": filename}
            for meta in result["metadatas"]
        ]
        collection.update(ids=result["ids"], metadatas=updated)

    @staticmethod
    def get_full_resume_text(source: str) -> str:
        """Retrieve and reassemble all stored chunks for a given resume filename."""
        results = collection.get(
            where={"source": source},
            include=["documents"],
        )
        chunks = results.get("documents", [])
        return "\n".join(chunks)
