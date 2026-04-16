import os
import json
from typing import Dict, List, Optional
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- System prompt: generate follow-up questions from a brief job intent ---
QUESTION_GENERATION_PROMPT = """
You are a senior HR consultant with deep expertise across all industries and job functions.
A hiring manager has given you a brief job requirement.
Your job is to generate exactly 5 targeted follow-up questions that will help you write a
comprehensive, accurate Job Description.

Rules:
1. Questions must be directly relevant to the specific role and domain mentioned.
2. Never ask generic questions that would not apply to this exact role.
3. Cover these angles: team/reporting structure, technical or domain depth required,
   industry/product context, seniority and ownership expectations, work arrangement.
4. Return ONLY a valid JSON array of exactly 5 question strings.
   No numbering, no explanations, no markdown.

Example output:
["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]
"""

# --- System prompt: generate a structured JD from intent + Q&A answers ---
JD_GENERATION_PROMPT = """
You are an expert HR Recruitment Specialist. Your task is to create a highly specific,
tailored Job Description based STRICTLY on the hiring manager's job requirement and their
answers to follow-up questions.

CRITICAL RULES — you MUST follow all of these:
1. Every detail in the JD MUST come directly from the manager's input. Do NOT add generic filler.
2. If the manager mentioned a specific tool, domain, team size, architecture, or expectation — it MUST appear in the JD.
3. Required skills must EXACTLY reflect what was discussed. Do not add skills that were not mentioned.
4. The description must reference the specific context provided (industry, team structure, ownership level, tech stack).
5. Do NOT produce a generic JD. If the manager said "fintech", the JD must reflect fintech. If they said "lead role", the JD must reflect leadership expectations.
6. Key Responsibilities must be derived from the manager's answers, not from a generic template.

Return ONLY a valid JSON object with no markdown or extra text:
1. 'title': Specific job title derived from the input.
2. 'description': A specific 2-3 paragraph job summary with Key Responsibilities grounded in the manager's answers.
3. 'required_skills': Flat array of technical tags matching exactly what was discussed.
4. 'experience_level': Standardized level ('Junior', 'Mid-Level', 'Senior', 'Lead').
"""


def generate_jd_questions(intent: str) -> List[str]:
    """
    Takes a brief job intent and returns 5 role-specific follow-up questions.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": QUESTION_GENERATION_PROMPT},
                {"role": "user", "content": f"Job requirement: {intent}"},
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content.strip()

        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        questions = json.loads(content)
        return questions if isinstance(questions, list) else []

    except Exception as e:
        return [f"Error generating questions: {str(e)}"]


def generate_structured_jd(
    intent: str,
    answers: Optional[Dict[str, str]] = None,
) -> Dict:
    """
    Generates a structured JD JSON.
    - intent: the brief job requirement (e.g. "React developer, 3+ years")
    - answers: dict mapping each follow-up question to the manager's answer
    """
    try:
        if answers:
            qa_block = "\n".join(
                f"Q: {q}\nA: {a}" for q, a in answers.items()
            )
            user_content = (
                f"Job Requirement: {intent}\n\n"
                f"Additional Context from Hiring Manager:\n{qa_block}"
            )
        else:
            user_content = intent

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": JD_GENERATION_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
        )

        content = response.choices[0].message.content.strip()

        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        return json.loads(content)

    except Exception as e:
        return {
            "title": "",
            "description": "",
            "required_skills": [],
            "experience_level": "",
            "error": str(e),
        }
