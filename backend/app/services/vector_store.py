import os
from typing import List
import PyPDF2
from openai import OpenAI
import chromadb

# Initialize modern OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize ChromaDB (Standard persistent client)
# Note: Settings for duckdb+parquet are deprecated in newer Chroma versions; 
# using the standard PersistentClient instead.
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="resumes",
    metadata={"hnsw:space": "cosine"} # This makes 1.0 = perfect match
)

def _extract_text_from_pdf(file_path: str) -> str:
    """Extract raw text from a PDF file."""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        text = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(text)

def _chunk_text(text: str, chunk_size: int = 1000) -> List[str]:
    """Split text into manageable chunks."""
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]

def _get_embeddings(texts: List[str]) -> List[List[float]]:
    # Correct v1.0+ Syntax
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    return [item.embedding for item in response.data]

class VectorStoreService:
    @staticmethod
    def process_and_store_resumes(file_paths: List[str]):
        for path in file_paths:
            text = _extract_text_from_pdf(path)
            chunks = _chunk_text(text)
            
            # Get embeddings for all chunks in one API call
            embeddings = _get_embeddings(chunks)
            
            ids = [f"{os.path.basename(path)}_{i}" for i in range(len(chunks))]
            metadatas = [{"source": os.path.basename(path)} for _ in range(len(chunks))]
            
            collection.add(
                ids=ids,
                documents=chunks,
                embeddings=embeddings,
                metadatas=metadatas
            )

    @staticmethod
    def find_best_matches(job_description: str, top_n: int = 5) -> List[dict]:
        # 1. Generate the embedding for the Job Description
        jd_embedding = _get_embeddings([job_description])[0]

        # 2. Query more results than needed so deduplication still yields top_n unique resumes
        results = collection.query(
            query_embeddings=[jd_embedding],
            n_results=top_n * 4,
            include=['documents', 'metadatas', 'distances']
        )

        # 3. Deduplicate: keep the best-scoring chunk per resume file
        seen_sources = set()
        matches = []
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
                        "source": source,
                        "snippet": doc[:200] + "...",
                        "score": round(1 - float(dist), 4),  # cosine distance → similarity
                    })
                if len(matches) >= top_n:
                    break
        return matches

    @staticmethod
    def get_full_resume_text(source: str) -> str:
        """Retrieve and reassemble all stored chunks for a given resume filename."""
        results = collection.get(
            where={"source": source},
            include=["documents"],
        )
        chunks = results.get("documents", [])
        return "\n".join(chunks)