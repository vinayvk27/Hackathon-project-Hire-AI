"""Turn-based interview engine.

Drives two sequential rounds:
  1. HR Screening  — handled by "Priya" (warm, Chennai-based HR)
  2. Technical     — handled by "Arjun" (firm technical lead)

The full conversation is stored as a JSON array in
``Candidate.screening_audio_log``.  Each element is a standard
OpenAI-style message dict: ``{"role": "assistant"|"user", "content": "..."}``.

Sentinel: when the active persona decides the round is complete it
**must** end its reply with the token ``[INTERVIEW_COMPLETE]``.  The
manager strips that token from the displayed text and advances the
workflow state.
"""

from __future__ import annotations

import json
import os
from typing import TypedDict

from openai import OpenAI
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.job import Job

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

COMPLETION_TOKEN = "[INTERVIEW_COMPLETE]"

# ---------------------------------------------------------------------------
# Persona system prompts
# ---------------------------------------------------------------------------

_PRIYA_SYSTEM = """\
You are Priya, a warm and friendly HR executive at a tech company based in Chennai.
You speak naturally in South Indian English — occasionally using phrases like
"ya", "no?", "only", "itself" — but always remain professional.

Your sole job in this screening call is to:
1. Greet the candidate by name and introduce yourself.
2. Ask them to give a brief introduction about themselves.
3. Confirm their current CTC and expected CTC (in lakhs per annum).
4. Ask about their notice period and whether they can negotiate it.
5. Check if they are comfortable with the location and work mode.
6. Close warmly and tell them the technical round will follow shortly.

Rules:
- Ask ONE question at a time; wait for the answer before continuing.
- Keep responses short (2-4 sentences max).
- Do NOT discuss technical skills, projects, or the job description.
- When you have collected all five data points above, end your FINAL
  message with the exact token: {token}
  Do not add anything after it.
""".format(token=COMPLETION_TOKEN)

_ARJUN_SYSTEM = """\
You are Arjun Mehta, a Senior Software Engineer and technical interviewer based in Bangalore.
You are sharp, direct, and methodical. You naturally use Bangalore tech-culture phrases like
"basically", "bandwidth", "super cool", "no da", "right?", and "makes sense?" in conversation.

Your job is to rigorously evaluate the candidate's technical depth by mapping the Job Description
requirements directly to the candidate's stated resume experience (captured in the HR round notes
provided below).

Interview structure (strictly follow this order):
1. Brief intro — greet the candidate, mention you are from the technical team in Bangalore,
   and tell them this is the technical round.
2. Ask exactly 5–6 targeted technical questions that directly map the required skills from
   the Job Description to specific experiences mentioned in the candidate's background.
   For each answer that is shallow or vague, ask ONE focused follow-up before moving on.
3. After all questions, ask one system-design or architecture question relevant to the role.
4. Ask if they have any questions for you, respond briefly.
5. Close professionally and warmly.

Rules:
- One question at a time — never bundle multiple questions.
- Keep each response under 5 sentences.
- Do NOT give hints, validate answers, or reveal the correct answer mid-interview.
- Use "basically", "bandwidth", or "super cool" naturally at least once per 2 responses.
- After step 5 (close), end your FINAL message with the exact token: {token}
  Do not add anything after it.
""".format(token=COMPLETION_TOKEN)

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


class InterviewResult(TypedDict):
    reply_text: str
    is_complete: bool
    interview_status: str
    voice: str


def get_next_response(
    candidate_id: int,
    user_transcript: str,
    db: Session,
) -> InterviewResult:
    """Append the candidate's utterance, call the active persona, persist state.

    Returns the persona's reply text (sentinel stripped), a completion flag,
    and the current ``interview_status`` string.
    """
    candidate: Candidate | None = (
        db.query(Candidate).filter(Candidate.id == candidate_id).first()
    )
    if candidate is None:
        raise ValueError(f"Candidate {candidate_id} not found")

    # ---- Determine active persona ----------------------------------------
    status = candidate.interview_status or "Pending_Screening"

    if status == "Screening_Done":
        # Technical round — Arjun
        history_so_far: list[dict] = _load_log(candidate.screening_audio_log)
        system_prompt = _arjun_system_with_jd(candidate, db, history_so_far)
        next_status_on_complete = "Interview_Complete"
        active_voice = "onyx"
    else:
        # HR screening (default / Pending_Screening) — Priya
        system_prompt = _priya_system_with_name(candidate)
        next_status_on_complete = "Screening_Done"
        active_voice = "nova"

    # ---- Load conversation history (Arjun reuses history_so_far already loaded above) ---
    history: list[dict] = history_so_far if status == "Screening_Done" else _load_log(candidate.screening_audio_log)

    # ---- Append candidate message ----------------------------------------
    history.append({"role": "user", "content": user_transcript})

    # ---- Call LLM -----------------------------------------------------------
    messages = [{"role": "system", "content": system_prompt}] + history
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.7,
        max_tokens=400,
    )
    raw_reply: str = completion.choices[0].message.content.strip()

    # ---- Detect completion sentinel ---------------------------------------
    is_complete = COMPLETION_TOKEN in raw_reply
    reply_text = raw_reply.replace(COMPLETION_TOKEN, "").strip()

    # ---- Append assistant message -----------------------------------------
    history.append({"role": "assistant", "content": reply_text})

    # ---- Persist -------------------------------------------------------------
    candidate.screening_audio_log = json.dumps(history)

    if is_complete:
        candidate.interview_status = next_status_on_complete
        if next_status_on_complete == "Interview_Complete":
            _run_summary_analysis(candidate, history, db)

    db.commit()

    return InterviewResult(
        reply_text=reply_text,
        is_complete=is_complete,
        interview_status=candidate.interview_status,
        voice=active_voice,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_log(raw: str | None) -> list[dict]:
    """Parse ``screening_audio_log`` JSON, returning an empty list on failure."""
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except (json.JSONDecodeError, TypeError):
        pass
    return []


def _priya_system_with_name(candidate: Candidate) -> str:
    return _PRIYA_SYSTEM + f"\nThe candidate's name is {candidate.name}."


def _arjun_system_with_jd(candidate: Candidate, db: Session, history: list[dict]) -> str:
    jd_snippet = ""
    if candidate.job_id:
        job: Job | None = db.query(Job).filter(Job.id == candidate.job_id).first()
        if job:
            skills = ", ".join(job.required_skills or [])
            jd_snippet = (
                f"\nJob Title: {job.title}"
                f"\nRequired Skills: {skills}"
                f"\nExperience Level: {job.experience_level or 'Not specified'}"
            )

    # Summarise the HR round so Arjun knows the candidate's background
    priya_notes = ""
    if history:
        lines = [
            f"  {'Candidate' if m['role'] == 'user' else 'HR (Priya)'}: {m['content']}"
            for m in history
        ]
        priya_notes = (
            "\n\n--- Round 1 HR Screening Notes (use to map questions to candidate's background) ---\n"
            + "\n".join(lines)
            + "\n--- End of HR Notes ---"
        )

    return _ARJUN_SYSTEM + jd_snippet + priya_notes


def _run_summary_analysis(
    candidate: Candidate,
    history: list[dict],
    db: Session,
) -> None:
    """Generate a short debrief and store it in ``reasoning_summary``."""
    transcript = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in history
    )
    prompt = (
        "You are an HR analyst. Read the following interview transcript and write "
        "a concise (3-5 bullet points) candidate summary covering: communication "
        "style, CTC expectations, notice period, and overall impression. "
        "Be factual and objective.\n\n"
        f"TRANSCRIPT:\n{transcript}"
    )
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
        )
        summary = resp.choices[0].message.content.strip()
    except Exception:
        summary = "Summary generation failed."

    candidate.reasoning_summary = summary
    # status already set by caller before this runs; no extra commit needed
