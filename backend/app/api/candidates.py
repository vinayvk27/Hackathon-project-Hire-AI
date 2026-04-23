import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from pydantic import BaseModel

from app.services.vector_store import VectorStoreService
from app.services.mcp_router import route_jd_intent, get_system_prompt_by_domain
from app.services.llm_evaluator import evaluate_candidate
from app.database import SessionLocal
from app.models import Job, Candidate
from app.models.candidate import generate_candidate_credentials, username_from_name

router = APIRouter()


class UploadRequest(BaseModel):
    files: List[str]


@router.post("/upload-files")
async def upload_resume_files(files: List[UploadFile] = File(...)):
    """
    React-friendly endpoint: accepts real multipart file uploads,
    saves them server-side, then processes into ChromaDB.
    """
    upload_dir = "./uploads"
    os.makedirs(upload_dir, exist_ok=True)
    try:
        file_paths = []
        for file in files:
            file_path = os.path.join(upload_dir, file.filename)
            with open(file_path, "wb") as f:
                f.write(await file.read())
            file_paths.append(file_path)
        VectorStoreService.process_and_store_resumes(file_paths)
        return {"message": f"Successfully processed {len(file_paths)} resumes"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
def upload_resumes(request: UploadRequest):
    try:
        VectorStoreService.process_and_store_resumes(request.files)
        return {"message": f"Successfully processed {len(request.files)} resumes"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/match/{job_id}")
def match_candidates(job_id: int):
    """
    Full pipeline:
    1. Fetch JD from SQLite
    2. Vector pre-filter via ChromaDB (top 5 unique resumes)
    3. MCP intent routing → picks domain-specific system prompt
    4. LLM re-ranks each candidate with structured scoring
    5. Returns results sorted by LLM overall_score
    """
    db = SessionLocal()
    try:
        # Step 1: Get job from DB
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        jd_text = f"{job.title}\n{job.description}\nRequired Skills: {', '.join(job.required_skills)}"

        # Step 2: Vector similarity pre-filter
        vector_matches = VectorStoreService.find_best_matches(jd_text, top_n=5)

        if not vector_matches:
            return {"job_title": job.title, "domain": "Unknown", "matches": []}

        # Step 3: MCP intent routing — determine domain from JD
        domain = route_jd_intent(jd_text)
        system_prompt = get_system_prompt_by_domain(domain)

        # Step 4: LLM evaluation for each candidate
        enriched_matches = []
        for match in vector_matches:
            full_resume_text = VectorStoreService.get_full_resume_text(match["source"])
            llm_eval = evaluate_candidate(full_resume_text, jd_text, system_prompt)
            enriched_matches.append({
                "source": match["source"],
                "snippet": match["snippet"],
                "vector_score": match["score"],
                "domain": domain,
                "llm_evaluation": llm_eval,
            })

        # Step 5: Sort by LLM overall_score descending, discard scores below 50
        enriched_matches.sort(
            key=lambda x: x["llm_evaluation"].get("overall_score", 0),
            reverse=True,
        )
        qualified = [m for m in enriched_matches if m["llm_evaluation"].get("overall_score", 0) >= 50]

        # Step 6: Auto-register top 3 qualified candidates as Shortlisted
        top3 = qualified[:3]
        for match in top3:
            filename = match["source"]
            llm_eval = match["llm_evaluation"]

            extracted_name  = llm_eval.get("candidate_name") or ""
            extracted_email = llm_eval.get("candidate_email") or ""
            if not extracted_name or extracted_name == "Unknown Candidate":
                extracted_name = os.path.splitext(os.path.basename(filename))[0]
            if not extracted_email or extracted_email == "Not Provided":
                extracted_email = None  # resolved below after username is set

            username = username_from_name(extracted_name)
            if not extracted_email:
                extracted_email = f"{username}@hire.ai"

            _, password = generate_candidate_credentials(filename)

            # Avoid duplicate registrations on repeated calls (match on email)
            existing = db.query(Candidate).filter(Candidate.email == extracted_email).first()
            if existing:
                match["username"] = existing.username
                match["password"] = existing.password
                continue

            candidate = Candidate(
                name=extracted_name,
                email=extracted_email,
                username=username,
                password=password,
                password_hash=password,  # plain-text for demo — no hashing
                resume_source=filename,
                job_id=job_id,
                match_score=llm_eval.get("overall_score", 0.0),
                status="Shortlisted",
            )
            db.add(candidate)
            db.commit()
            db.refresh(candidate)

            match["username"] = username
            match["password"] = password

        return {
            "job_title": job.title,
            "domain": domain,
            "matches": enriched_matches,
        }

    finally:
        db.close()
