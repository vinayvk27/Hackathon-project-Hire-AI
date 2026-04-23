import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def evaluate_candidate(resume_text: str, jd_text: str, system_prompt: str) -> dict:
    """
    Uses the domain-specific system prompt to LLM-score a candidate's resume
    against the job description. Returns structured JSON evaluation.
    """
    user_message = (
        f"JOB DESCRIPTION:\n{jd_text}\n\n"
        f"CANDIDATE RESUME:\n{resume_text}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,
        )

        content = response.choices[0].message.content.strip()

        # Strip markdown code fences if the model adds them
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        return json.loads(content)

    except Exception as e:
        return {
            "candidate_name": "Unknown Candidate",
            "candidate_email": "Not Provided",
            "overall_score": 0,
            "alignment_metrics": {
                "experience_score": 0,
                "skill_score": 0,
                "cultural_potential": 0,
            },
            "summary": f"Evaluation failed: {str(e)}",
            "green_flags": [],
            "red_flags": ["Evaluation error — check logs"],
            "technical_depth_critique": "",
            "missing_required_skills": [],
        }
