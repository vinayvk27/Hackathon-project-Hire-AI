"""Turn-based interview engine.

Drives three sequential rounds:
  1. HR Screening  — handled by "Priya"  (warm, Chennai-based HR)
  2. Technical     — handled by "Arjun"  (firm technical lead, Bangalore)
  3. Final         — handled by "Rajesh" (senior hiring manager / Director)

Conversation logs:
  - ``screening_audio_log`` — Priya's round only
  - ``tech_audio_log``      — Arjun's round, then a marker, then Rajesh's round

Status transitions (interview_status):
  Pending_Screening  →[Priya done]→  Screening_Done
  Screening_Done     →[assessment done; candidate.status="Assessed"]→
  Screening_Done + Assessed  →[Arjun done]→  Tech_Done
  Tech_Done          →[Rajesh done]→  Interview_Complete

Sentinel: when the active persona decides the round is complete it
**must** end its reply with ``[INTERVIEW_COMPLETE]``.  The manager strips
that token and advances the workflow state.
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
_ARJUN_ROUND_MARKER = "[ARJUN_ROUND_COMPLETE]"

_PRIYA_VOICE  = "nova"
_ARJUN_VOICE  = "onyx"
_RAJESH_VOICE = "echo"

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
- Ask ONE question at a time; wait for the candidate to answer before continuing.
- Keep responses short (2-4 sentences max).
- Do NOT discuss technical skills, projects, or the job description.
- CRITICAL: Do NOT output the {token} until you have successfully collected ALL five data points above. Do not skip to the closing step early.
- When you have collected all data and said goodbye, end your FINAL message with the exact token: {token}
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
1. Brief intro (ONLY IF this is the first message of the interview) — greet the candidate, mention you are from the technical team, and tell them this is the technical round. If you have already introduced yourself, skip this and proceed directly to your next question.
2. You MUST ask exactly 3 technical questions that directly map the required skills from
   the Job Description to specific experiences mentioned in the candidate's background.
   For each answer that is shallow or vague, ask ONE focused follow-up before moving on.
3. After the 3 questions, ask one system-design or architecture question relevant to the role.
4. Ask if they have any questions for you, respond briefly.
5. Close professionally and warmly.

Rules:
- Ask only ONE question at a time. Wait for the candidate to answer before asking the next question.
- Keep each response under 5 sentences.
- Do NOT give hints, validate answers, or reveal the correct answer mid-interview.
- Use "basically", "bandwidth", or "super cool" naturally at least once per 2 responses.
- CRITICAL: Do NOT output the {token} until the candidate has fully answered ALL 4 of your assigned questions. Do not skip to the closing step early.
- After step 5 (close), end your FINAL message with the exact token: {token}
  Do not add anything after it.
""".format(token=COMPLETION_TOKEN)


_RAJESH_SYSTEM = """\
You are Rajesh Kumar, Head of HR Senior Hiring Manager at a leading tech company.
You are authoritative, composed, and insightful. You speak with measured confidence and occasionally
use phrases like "let me be direct", "from a business standpoint", "that's what we value here",
and "I'll tell you why that matters".

Your role is to conduct the FINAL interview round. You have reviewed both the HR screening notes
and the technical interview notes from the previous two rounds (provided below as all_notes).
Your goal is to assess cultural fit, ownership mindset, and readiness for the role.

Interview structure (strictly follow this order):
1. Welcome the candidate to the final round; introduce yourself as Director of Engineering.
2. Ask exactly 3 targeted questions covering:
   - A past situation that demonstrates ownership and initiative.
   - How they handle ambiguity or disagreement with stakeholders.
   - Cross-functional collaboration or influencing without authority.
3. Reference the previous rounds where relevant — acknowledge strong points or probe gaps.
4. Invite the candidate to ask you questions; respond thoughtfully and honestly.
5. Close professionally, mention next steps, and wish them well.

Rules:
- Ask only ONE question at a time. Wait for the candidate to answer before asking the next question.
- Keep each response to 3–5 sentences.
- Reference specifics from the previous rounds naturally (e.g., "I noticed in your technical
  round you mentioned X — tell me more about how that played out with the team.").
- CRITICAL: Do NOT output the {token} until the candidate has fully answered ALL 3 of your assigned questions. Do not skip to the closing step early.
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

    interview_status = candidate.interview_status or "Pending_Screening"
    candidate_status = candidate.status or "Applied"

    # ---- Determine active persona ----------------------------------------
    if interview_status == "Tech_Done":
        # Stage 4 — Final round with Rajesh
        priya_history = _load_log(candidate.screening_audio_log)
        arjun_history, rajesh_history = _split_tech_log(candidate.tech_audio_log)
        system_prompt = _rajesh_system_with_notes(candidate, db, priya_history, arjun_history)
        history = rajesh_history
        active_voice = _RAJESH_VOICE
        next_status_on_complete = "Interview_Complete"

    elif interview_status == "Screening_Done" and candidate_status == "Assessed":
        # Stage 3 — Technical round with Arjun
        priya_history = _load_log(candidate.screening_audio_log)
        arjun_history, _ = _split_tech_log(candidate.tech_audio_log)
        # Arjun's history is the post-marker section (empty until his round starts)
        history = arjun_history
        system_prompt = _arjun_system_with_jd(candidate, db, priya_history)
        active_voice = _ARJUN_VOICE
        next_status_on_complete = "Tech_Done"

    else:
        # Stage 1 — HR screening with Priya (default / Pending_Screening)
        history = _load_log(candidate.screening_audio_log)
        system_prompt = _priya_system_with_name(candidate)
        active_voice = _PRIYA_VOICE
        next_status_on_complete = "Screening_Done"

    # ---- Append candidate message ----------------------------------------
    history.append({"role": "user", "content": user_transcript})

    # ---- Call LLM -----------------------------------------------------------
    messages = [{"role": "system", "content": system_prompt}] + history
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        max_tokens=400,
    )
    raw_reply: str = completion.choices[0].message.content.strip()

    # ---- Detect completion sentinel ---------------------------------------
    is_complete = COMPLETION_TOKEN in raw_reply
    reply_text = raw_reply.replace(COMPLETION_TOKEN, "").strip()

    # ---- Append assistant message ----------------------------------------
    history.append({"role": "assistant", "content": reply_text})

    # ---- Enforce minimum interview length (Arjun / Rajesh only) ----------
    # history now includes the just-added assistant turn; <6 means fewer than
    # 3 bot questions + 3 user answers have occurred in this round.
    _is_arjun_or_rajesh = interview_status in ("Screening_Done", "Tech_Done")
    if is_complete and _is_arjun_or_rajesh and len(history) < 6:
        is_complete = False
        reply_text += (
            "\n[Internal System: You attempted to end the interview early. "
            "You MUST ask your remaining questions before concluding.]"
        )
        history[-1]["content"] = reply_text

    # ---- Persist ---------------------------------------------------------
    if interview_status == "Tech_Done":
        # Reassemble tech_audio_log: arjun_history + marker + rajesh_history
        arjun_history_stored, _ = _split_tech_log(candidate.tech_audio_log)
        candidate.tech_audio_log = json.dumps(
            arjun_history_stored
            + [{"role": "system", "content": _ARJUN_ROUND_MARKER}]
            + history
        )
    elif interview_status == "Screening_Done" and candidate_status == "Assessed":
        # Arjun's section — no marker yet; store as plain list in tech_audio_log
        candidate.tech_audio_log = json.dumps(history)
    else:
        # Priya's section
        candidate.screening_audio_log = json.dumps(history)

    if is_complete:
        candidate.interview_status = next_status_on_complete

        if next_status_on_complete == "Tech_Done":
            # Seal Arjun's section with a round-complete marker
            candidate.tech_audio_log = json.dumps(
                history + [{"role": "system", "content": _ARJUN_ROUND_MARKER}]
            )

        if next_status_on_complete == "Interview_Complete":
            priya_h = _load_log(candidate.screening_audio_log)
            arjun_h, rajesh_h = _split_tech_log(candidate.tech_audio_log)
            _run_summary_analysis(candidate, priya_h, arjun_h, rajesh_h, db)

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
    """Parse a JSON conversation log, returning an empty list on failure."""
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except (json.JSONDecodeError, TypeError):
        pass
    return []


def _split_tech_log(raw: str | None) -> tuple[list[dict], list[dict]]:
    """Split tech_audio_log at the Arjun-round marker.

    Returns (arjun_messages, rajesh_messages).
    """
    full = _load_log(raw)
    try:
        idx = next(
            i for i, m in enumerate(full)
            if m.get("content") == _ARJUN_ROUND_MARKER
        )
        return full[:idx], full[idx + 1:]
    except StopIteration:
        return full, []


def _priya_system_with_name(candidate: Candidate) -> str:
    return _PRIYA_SYSTEM + f"\nThe candidate's name is {candidate.name}."


def _arjun_system_with_jd(candidate: Candidate, db: Session, priya_history: list[dict]) -> str:
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

    priya_notes = ""
    if priya_history:
        lines = [
            f"  {'Candidate' if m['role'] == 'user' else 'HR (Priya)'}: {m['content']}"
            for m in priya_history
            if m.get("role") in ("user", "assistant")
        ]
        priya_notes = (
            "\n\n--- Round 1 HR Screening Notes (use to map questions to candidate's background) ---\n"
            + "\n".join(lines)
            + "\n--- End of HR Notes ---"
        )

    return _ARJUN_SYSTEM + jd_snippet + priya_notes


def _rajesh_system_with_notes(
    candidate: Candidate,
    db: Session,
    priya_history: list[dict],
    arjun_history: list[dict],
) -> str:
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

    def _format_round(history: list[dict], hr_label: str, candidate_label: str = "Candidate") -> str:
        lines = [
            f"  {candidate_label if m['role'] == 'user' else hr_label}: {m['content']}"
            for m in history
            if m.get("role") in ("user", "assistant")
        ]
        return "\n".join(lines)

    all_notes = ""
    if priya_history:
        all_notes += (
            "\n\n--- Round 1: HR Screening Notes (Priya) ---\n"
            + _format_round(priya_history, "Priya (HR)")
            + "\n--- End Round 1 ---"
        )
    if arjun_history:
        all_notes += (
            "\n\n--- Round 2: Technical Interview Notes (Arjun) ---\n"
            + _format_round(arjun_history, "Arjun (Tech)")
            + "\n--- End Round 2 ---"
        )

    return _RAJESH_SYSTEM + jd_snippet + all_notes


def _run_summary_analysis(
    candidate: Candidate,
    priya_history: list[dict],
    arjun_history: list[dict],
    rajesh_history: list[dict],
    db: Session,
) -> None:
    """Generate a combined debrief across all rounds and store it in ``reasoning_summary``."""

    def _fmt(history: list[dict], label: str) -> str:
        lines = [
            f"{m['role'].upper()}: {m['content']}"
            for m in history
            if m.get("role") in ("user", "assistant")
        ]
        return f"=== {label} ===\n" + "\n".join(lines) if lines else ""

    parts = [
        _fmt(priya_history,  "Round 1 — HR Screening (Priya)"),
        _fmt(arjun_history,  "Round 2 — Technical Interview (Arjun)"),
        _fmt(rajesh_history, "Round 3 — Final Round (Rajesh)"),
    ]
    transcript = "\n\n".join(p for p in parts if p)

    prompt = (
        "You are an HR analyst. Read the following three-round interview transcript and write "
        "a concise (5-7 bullet points) candidate summary covering: communication style, "
        "CTC expectations, notice period, technical depth, cultural fit, and overall hiring recommendation. "
        "Be factual and objective.\n\n"
        f"TRANSCRIPT:\n{transcript}"
    )
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
        )
        summary = resp.choices[0].message.content.strip()
    except Exception:
        summary = "Summary generation failed."

    candidate.reasoning_summary = summary
