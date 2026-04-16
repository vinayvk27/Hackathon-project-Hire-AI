import os
import json
import sqlite3
from typing import TypedDict, Optional, List
from openai import OpenAI
from langgraph.graph import StateGraph, END

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── State Definition ──────────────────────────────────────────────────────────

class AssessmentState(TypedDict):
    candidate_id:         str
    job_id:               int
    resume_text:          str
    job_description:      str
    match_score:          float
    assessment_questions: List[dict]   # {id, type, question, options?, correct_answer?}
    assessment_answers:   List[dict]   # {question_id, question, answer}
    technical_score:      Optional[int]
    reasoning_summary:    Optional[str]
    current_step:         str          # screening | written_test | video_interview


# ── System Prompts ────────────────────────────────────────────────────────────

QUESTION_GENERATOR_PROMPT = """
You are a Senior Technical Interview Designer at a top-tier tech company.

Your task is to generate a personalized technical assessment based on a candidate's resume
and the job description they applied for.

ADAPTIVE DIFFICULTY RULES (strictly follow these):
- match_score >= 70 (Strong match):
  * Focus on ARCHITECTURAL decisions, SYSTEM DESIGN, EDGE CASES, and TRADE-OFFS
  * Ask "why did you choose X over Y?" style questions
  * Include at least 2 scenario-based questions
  * MCQ options should be close/tricky to test deep knowledge

- match_score < 70 (Weak match):
  * Focus on FOUNDATIONAL concepts to verify the candidate has the basics
  * Ask definition-level and simple application questions
  * MCQ options should clearly test conceptual understanding

OUTPUT FORMAT: Return ONLY valid JSON. No markdown. No extra text.
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "B"
    },
    {
      "id": 2,
      "type": "short_answer",
      "question": "..."
    }
  ]
}

Generate exactly 7 questions: 3 MCQ + 4 short answer.
Questions MUST be specific to the candidate's resume and the job requirements.
Do NOT generate generic questions.
"""

TECHNICAL_EVALUATOR_PROMPT = """
You are a Senior Technical Evaluator. Your job is to score a candidate's assessment answers.

EVALUATION RULES:
1. Do NOT just keyword match. Evaluate the LOGIC, DEPTH, and CORRECTNESS of each answer.
2. For MCQ: award full points for correct answer, zero for wrong.
3. For short answer: judge:
   - Technical accuracy (is the answer correct?)
   - Depth (does the candidate understand WHY, not just WHAT?)
   - Practical awareness (do they know real-world implications?)
4. Assign an overall score from 0 to 100.
5. Write a 3-5 sentence reasoning_summary that a hiring manager can read to understand
   the candidate's technical depth. Be specific — mention what impressed you or what gaps exist.

OUTPUT FORMAT: Return ONLY valid JSON. No markdown.
{
  "technical_score": 0,
  "reasoning_summary": "..."
}
"""


# ── Node: Question Generator ──────────────────────────────────────────────────

def question_generator_node(state: AssessmentState) -> dict:
    match_score     = state.get("match_score", 0)
    resume_text     = state.get("resume_text", "")
    job_description = state.get("job_description", "")

    user_content = (
        f"match_score: {match_score}\n\n"
        f"JOB DESCRIPTION:\n{job_description}\n\n"
        f"CANDIDATE RESUME:\n{resume_text[:3000]}"   # cap to avoid token overload
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": QUESTION_GENERATOR_PROMPT},
            {"role": "user",   "content": user_content},
        ],
        temperature=0.3,
    )

    content = response.choices[0].message.content.strip()
    if content.startswith("```json"):
        content = content[7:-3].strip()
    elif content.startswith("```"):
        content = content[3:-3].strip()

    parsed = json.loads(content)
    questions = parsed.get("questions", [])

    return {
        "assessment_questions": questions,
        "current_step": "written_test",
    }


# ── Node: Technical Evaluator ─────────────────────────────────────────────────

def technical_evaluator_node(state: AssessmentState) -> dict:
    questions = state.get("assessment_questions", [])
    answers   = state.get("assessment_answers", [])

    # Build a readable Q&A block for the LLM
    qa_block = ""
    for q in questions:
        qid = q["id"]
        matched_answer = next((a["answer"] for a in answers if a["question_id"] == qid), "No answer provided")
        qa_block += f"\nQ{qid} [{q['type'].upper()}]: {q['question']}\n"
        if q["type"] == "mcq":
            qa_block += f"Options: {', '.join(q.get('options', []))}\n"
            qa_block += f"Correct Answer: {q.get('correct_answer', 'N/A')}\n"
        qa_block += f"Candidate's Answer: {matched_answer}\n"

    user_content = (
        f"JOB DESCRIPTION:\n{state.get('job_description', '')}\n\n"
        f"CANDIDATE RESUME SUMMARY:\n{state.get('resume_text', '')[:1500]}\n\n"
        f"ASSESSMENT Q&A:\n{qa_block}"
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": TECHNICAL_EVALUATOR_PROMPT},
            {"role": "user",   "content": user_content},
        ],
        temperature=0.1,
    )

    content = response.choices[0].message.content.strip()
    if content.startswith("```json"):
        content = content[7:-3].strip()
    elif content.startswith("```"):
        content = content[3:-3].strip()

    result = json.loads(content)

    return {
        "technical_score":    result.get("technical_score", 0),
        "reasoning_summary":  result.get("reasoning_summary", ""),
        "current_step":       "video_interview",
    }


# ── Graph Assembly ────────────────────────────────────────────────────────────

def _build_graph(checkpointer):
    workflow = StateGraph(AssessmentState)
    workflow.add_node("question_generator",  question_generator_node)
    workflow.add_node("technical_evaluator", technical_evaluator_node)
    workflow.set_entry_point("question_generator")
    workflow.add_edge("question_generator",  "technical_evaluator")
    workflow.add_edge("technical_evaluator", END)
    return workflow.compile(
        checkpointer=checkpointer,
        interrupt_after=["question_generator"],   # pause here — wait for candidate answers
    )


# ── Checkpointer Setup ────────────────────────────────────────────────────────

def _make_checkpointer():
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver
        conn = sqlite3.connect("./assessment_checkpoints.db", check_same_thread=False)
        return SqliteSaver(conn)
    except Exception:
        from langgraph.checkpoint.memory import MemorySaver
        return MemorySaver()


checkpointer    = _make_checkpointer()
assessment_app  = _build_graph(checkpointer)
