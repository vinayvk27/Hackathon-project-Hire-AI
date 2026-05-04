# Database

File: `backend/recruit.db` (SQLite, SQLAlchemy ORM)

## Table: `candidates`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK | Auto-increment |
| `name` | STRING | NOT NULL | Full name |
| `email` | STRING | UNIQUE, NOT NULL | Contact email |
| `username` | STRING | UNIQUE, NOT NULL | Login username (`name_4hex`) |
| `password` | STRING | — | Plaintext (demo only) |
| `password_hash` | STRING | — | ⚠️ Populated but unused for auth |
| `resume_source` | STRING | — | PDF filename in `uploads/` |
| `job_id` | INTEGER | FK → jobs.id | Linked job |
| `match_score` | FLOAT | — | 0–100, LLM overall score |
| `status` | STRING | — | `Applied` \| `Shortlisted` \| `Assessed` \| `Rejected` |
| `technical_score` | INTEGER | — | 0–100, from LangGraph assessment |
| `reasoning_summary` | TEXT | — | LLM eval + post-interview debrief (5–7 bullets) |
| `screening_audio_log` | TEXT | — | JSON array — Priya conversation history |
| `tech_audio_log` | TEXT | — | JSON array — Arjun + `[MARKER]` + Rajesh history |
| `proctoring_score` | FLOAT | — | 0.0–1.0, cheating risk (vision analysis) |
| `interview_status` | STRING | — | `Pending_Screening` \| `Screening_Done` \| `Tech_Done` \| `Interview_Complete` |
| `created_at` | DATETIME | — | Row creation timestamp |

## Table: `jobs`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK | Auto-increment |
| `title` | STRING | — | Job title |
| `description` | STRING | — | Full JD text |
| `required_skills` | JSON | — | Array of skill strings |
| `experience_level` | STRING | — | `Junior` \| `Mid-Level` \| `Senior` \| `Lead` |

## Relationships

| Relationship | Type | Details |
|-------------|------|---------|
| `candidates.job_id` → `jobs.id` | Many-to-one | Many candidates per job; no ORM `relationship()` declared — raw FK only |

## LangGraph Checkpoint DB

File: `backend/assessment_checkpoints.db` (SQLite)
- Managed by `SqliteSaver` from LangGraph
- Stores assessment graph state per `thread_id = candidate_id`
- Do not query directly; access via `assessment_graph.py`
