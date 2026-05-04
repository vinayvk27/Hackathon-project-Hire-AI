# Backend

## Endpoints

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | `/api/login` | `auth.manager_login` | No |
| POST | `/auth/login` | `auth.login` | No |
| POST | `/jobs/questions` | `jobs.get_jd_questions` | No |
| POST | `/jobs/generate` | `jobs.generate_jd` | No |
| POST | `/jobs/create` | `jobs.create_job` | No |
| GET | `/jobs/list` | `jobs.list_jobs` | No |
| POST | `/candidates/upload-files` | `candidates.upload_resume_files` | No |
| POST | `/candidates/upload` | `candidates.upload_resumes` | No (legacy) |
| GET | `/candidates/match/{job_id}` | `candidates.match_candidates` | No |
| POST | `/audio/transcribe` | `audio.transcribe_audio` | No |
| POST | `/audio/speak` | `audio.text_to_speech` | No |
| POST | `/assessment/candidates/register` | `assessment.register_candidate` | No |
| POST | `/assessment/candidates/shortlist` | `assessment.shortlist_candidate` | No |
| POST | `/assessment/candidates/notify` | `assessment.notify_internal_candidates` | No |
| GET | `/assessment/candidates/list` | `assessment.list_candidates` | No |
| GET | `/assessment/start` | `assessment.start_assessment` | Yes (JWT) |
| POST | `/assessment/submit` | `assessment.submit_assessment` | Yes (JWT) |
| POST | `/interview/chat` | `interview.interview_chat` | No |
| POST | `/interview/analyze` | `interview.analyze_video` | No |
| GET | `/interview/report/{candidate_id}` | `interview.get_interview_report` | No |
| GET | `/api/internal/bench` | `internal.get_bench_employees` | No |
| POST | `/api/internal/match` | `internal.match_internal_candidates` | No |
| POST | `/api/external/match` | `external.match_external_candidates` | No |
| GET | `/api/budget` | `budget.get_budget_approval` | No |

## Core Modules

| Module | File | Responsibility |
|--------|------|----------------|
| FastAPI app | `app/main.py` | CORS (`*`), router mounting |
| DB session | `app/database.py` | `SessionLocal`, `get_db()` dependency |
| Auth utils | `app/api/auth.py` | JWT create/verify, mock manager map |
| Vector store | `app/services/vector_store.py` | ChromaDB embed + cosine query |
| LLM evaluator | `app/services/llm_evaluator.py` | Structured resume scoring |
| MCP router | `app/services/mcp_router.py` | Domain detection + rubric dispatch |
| AI service | `app/services/ai_service.py` | JD gen + question gen (GPT-4o-mini) |
| Assessment graph | `app/services/assessment_graph.py` | LangGraph topology + SqliteSaver |
| Interview manager | `app/logic/interview_manager.py` | Priya/Arjun/Rajesh persona routing |
| Media utils | `app/utils/media.py` | Whisper, TTS-1-HD, vision proctoring |

## Reusable Functions

| Function | File | Purpose |
|----------|------|---------|
| `_create_token(candidate_id)` | `app/api/auth.py` | JWT HS256, 8h expiry |
| `_create_token_with_claims(claims)` | `app/api/auth.py` | JWT with role/name claims |
| `generate_candidate_credentials(filename)` | `app/models/candidate.py` | username + 8-char password from filename |
| `username_from_name(name)` | `app/models/candidate.py` | `{slug}_{4-hex}` unique username |
| `_send_invitation_email(...)` | `app/api/assessment.py` | SMTP HTML invite with credentials |
| `VectorStoreService.process_and_store_resumes(file_paths)` | `app/services/vector_store.py` | PDF → chunks → ChromaDB |
| `VectorStoreService.find_best_matches(jd_text, top_n)` | `app/services/vector_store.py` | Cosine query, returns top N |
| `evaluate_candidate(resume_text, jd_text, system_prompt)` | `app/services/llm_evaluator.py` | GPT-4o-mini structured score |
| `route_jd_intent(jd_text)` | `app/services/mcp_router.py` | Keyword scan → domain string |
| `get_system_prompt_by_domain(domain)` | `app/services/mcp_router.py` | Domain-specific evaluation rubric |
| `generate_jd_questions(intent)` | `app/services/ai_service.py` | 5 follow-up questions (JSON) |
| `generate_structured_jd(intent, answers)` | `app/services/ai_service.py` | JD JSON (title, desc, skills, level) |
| `get_next_response(candidate_id, transcript, db)` | `app/logic/interview_manager.py` | Route to Priya/Arjun/Rajesh |
| `transcribe_audio(audio_bytes)` | `app/utils/media.py` | Whisper-1 STT |
| `generate_audio(text, voice)` | `app/utils/media.py` | TTS-1-HD → MP3 base64 |
| `background_behavior_analysis(video_bytes, sid, turn, logs)` | `app/utils/media.py` | 5-frame vision proctoring |
