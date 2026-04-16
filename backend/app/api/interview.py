"""Interview API routes.

POST /interview/chat           — per-turn endpoint (audio → transcript → reply → audio)
POST /interview/analyze        — standalone video proctoring
GET  /interview/report/{id}    — HR report: summary, proctoring logs, hire/no-hire verdict
"""

import json
import os
import threading
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from openai import OpenAI
from sqlalchemy.orm import Session

from app.database import get_db
from app.logic.interview_manager import get_next_response
from app.models.candidate import Candidate
from app.utils.media import (
    background_behavior_analysis,
    generate_audio,
    transcribe_audio,
)

router = APIRouter()
_openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# In-memory stores (keyed by str(candidate_id))
_behavior_logs: dict[str, list[str]] = {}
_recommendations: dict[int, dict] = {}   # cached hire/no-hire per candidate


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_recommendation(name: str, summary: str, logs: list[str]) -> dict:
    """Call GPT-4o-mini to produce a Hire / No Hire verdict + one-line reason."""
    if not summary:
        return {"verdict": "Pending", "reason": "No interview summary is available yet."}

    log_text = "\n".join(logs) if logs else "No behavioral observations were recorded."
    prompt = (
        f"You are a senior hiring manager reviewing the following interview report for {name}.\n\n"
        f"Interview Summary:\n{summary}\n\n"
        f"Behavioral Observations:\n{log_text}\n\n"
        "Give a concise hiring recommendation. "
        "Respond with ONLY valid JSON in this exact shape:\n"
        '{"verdict": "Hire" or "No Hire", "reason": "1-2 sentence explanation."}'
    )
    try:
        resp = _openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {"verdict": "Pending", "reason": "Recommendation could not be generated."}


# ---------------------------------------------------------------------------
# /report — HR interview report
# ---------------------------------------------------------------------------


@router.get("/report/{candidate_id}")
def get_interview_report(candidate_id: int, db: Session = Depends(get_db)):
    """Return the full interview report for a completed candidate.

    Response shape:
    ```json
    {
      "candidate_id":    1,
      "name":            "Jane Doe",
      "interview_status": "Interview_Complete",
      "ai_summary":      "• Warm communication style…",
      "proctoring_logs": ["[sid=1 turn=2] No issues detected.", …],
      "proctoring_score": 0.95,
      "recommendation":  {"verdict": "Hire", "reason": "…"}
    }
    ```
    """
    candidate: Candidate | None = (
        db.query(Candidate).filter(Candidate.id == candidate_id).first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    interview_status = getattr(candidate, "interview_status", "Pending_Screening")
    if interview_status != "Interview_Complete":
        raise HTTPException(
            status_code=400,
            detail=f"Interview not complete. Current status: {interview_status}",
        )

    logs = _behavior_logs.get(str(candidate_id), [])
    summary = candidate.reasoning_summary or ""

    # Cache recommendation to avoid repeated LLM calls on every modal open
    if candidate_id not in _recommendations:
        _recommendations[candidate_id] = _generate_recommendation(
            candidate.name, summary, logs
        )

    return {
        "candidate_id":     candidate_id,
        "name":             candidate.name,
        "interview_status": interview_status,
        "ai_summary":       summary or "No summary available.",
        "proctoring_logs":  logs,
        "proctoring_score": getattr(candidate, "proctoring_score", None),
        "recommendation":   _recommendations[candidate_id],
    }


# ---------------------------------------------------------------------------
# /chat — main interview turn
# ---------------------------------------------------------------------------


@router.post("/chat")
async def interview_chat(
    candidate_id: int = Form(...),
    turn: int = Form(0),
    audio_file: Optional[UploadFile] = File(None),
    text_input: Optional[str] = Form(None),
    video_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """Process one interview turn end-to-end.

    **Form fields**
    - ``candidate_id``  — integer PK of the Candidate row
    - ``turn``          — monotonically increasing turn counter (0-based)
    - ``text_input``    — (optional) skip STT; used for the opening greeting trigger

    **Files**
    - ``audio_file``    — candidate's spoken reply (webm / mp3 / wav)
    - ``video_file``    — optional image/video chunk for proctoring

    **Response**
    ```json
    {
      "transcript": "…", "reply_text": "…", "audio_base64": "…",
      "is_complete": false, "interview_status": "Pending_Screening"
    }
    ```
    """
    # 1. Resolve transcript
    if text_input and text_input.strip():
        transcript = text_input.strip()
    elif audio_file is not None:
        try:
            audio_bytes = await audio_file.read()
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Cannot read audio: {exc}")
        try:
            transcript = transcribe_audio(audio_bytes)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")
        if not transcript.strip():
            raise HTTPException(status_code=422, detail="Empty transcript — no speech detected.")
    else:
        raise HTTPException(status_code=422, detail="Provide either audio_file or text_input.")

    # 2. Generate AI reply
    try:
        result = get_next_response(candidate_id=candidate_id, user_transcript=transcript, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}")

    # 3. TTS — use persona-specific voice
    try:
        audio_b64 = generate_audio(result["reply_text"], voice=result["voice"])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS failed: {exc}")

    # 4. Background proctoring
    if video_file is not None:
        try:
            video_bytes = await video_file.read()
        except Exception:
            video_bytes = None
        if video_bytes:
            sid = str(candidate_id)
            logs = _behavior_logs.setdefault(sid, [])
            threading.Thread(
                target=background_behavior_analysis,
                args=(video_bytes, sid, turn, logs),
                daemon=True,
            ).start()

    return {
        "transcript":       transcript,
        "reply_text":       result["reply_text"],
        "audio_base64":     audio_b64,
        "is_complete":      result["is_complete"],
        "interview_status": result["interview_status"],
    }


# ---------------------------------------------------------------------------
# /analyze — standalone proctoring
# ---------------------------------------------------------------------------


@router.post("/analyze")
async def analyze_video(sid: str, turn: int = 0, file: UploadFile = File(...)):
    """Accept a raw video/image chunk and run proctoring analysis in the background."""
    try:
        video_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read file: {exc}")

    logs = _behavior_logs.setdefault(sid, [])
    threading.Thread(
        target=background_behavior_analysis,
        args=(video_bytes, sid, turn, logs),
        daemon=True,
    ).start()

    return {"status": "analysis_started", "sid": sid, "turn": turn}
