# AI Rules — What to Know Before Writing Code

## Endpoints (Do Not Duplicate)

- `POST /api/login`, `POST /auth/login`
- `POST /jobs/questions`, `POST /jobs/generate`, `POST /jobs/create`, `GET /jobs/list`
- `POST /candidates/upload-files`, `GET /candidates/match/{job_id}`
- `POST /audio/transcribe`, `POST /audio/speak`
- `POST /assessment/candidates/register`, `/shortlist`, `/notify`; `GET /assessment/candidates/list`
- `GET /assessment/start`, `POST /assessment/submit`
- `POST /interview/chat`, `POST /interview/analyze`, `GET /interview/report/{candidate_id}`
- `GET /api/internal/bench`, `POST /api/internal/match`, `POST /api/external/match`, `GET /api/budget`

## Functions to Reuse — Do Not Reimplement

| Function | Location |
|----------|----------|
| `_create_token` / `_create_token_with_claims` | `backend/app/api/auth.py` |
| `generate_candidate_credentials` / `username_from_name` | `backend/app/models/candidate.py` |
| `VectorStoreService.process_and_store_resumes` | `backend/app/services/vector_store.py` |
| `VectorStoreService.find_best_matches` | `backend/app/services/vector_store.py` |
| `evaluate_candidate` | `backend/app/services/llm_evaluator.py` |
| `route_jd_intent` / `get_system_prompt_by_domain` | `backend/app/services/mcp_router.py` |
| `transcribe_audio` / `generate_audio` | `backend/app/utils/media.py` |
| `background_behavior_analysis` | `backend/app/utils/media.py` |
| `get_next_response` | `backend/app/logic/interview_manager.py` |
| `deriveStatus` / `stageState` | `frontend-react/src/pages/CandidateDashboard.jsx` |

## Design, localStorage & Files

- TailwindCSS only — no component library; reuse `scoreColor(v)` in `Candidates.jsx`
- Wrap HR pages in `components/Layout.jsx`; proxy config in `vite.config.js`
- localStorage keys (exact): `hire_ai_auth`, `candidate_token`, `candidate_id`, `candidate_name`, `candidate_status`, `assessment_result`
- Never modify: `backend/chroma_db/`, `backend/assessment_checkpoints.db`, `frontend-react/dist/`

## Mocked / Hardcoded Areas

- HR credentials in `backend/app/api/auth.py`: `hw_demo`, `design_demo`, `hr_demo` / `password123`
- Bench employees in `backend/app/api/internal.py`: 3 hardcoded dicts — no DB table
- Budget in `backend/app/api/budget.py`: static dict — no DB table
- External resumes in `backend/mock_resumes/`: test PDFs only

## Key Constraints

- All LLM calls use `gpt-4o-mini` — do not switch models without updating all callers
- JWT auth only on `GET /assessment/start` and `POST /assessment/submit`; all other endpoints unauthenticated
- `candidate.password` is plaintext — do not add bcrypt without migrating existing rows
- CORS is `allow_origins=["*"]` — do not restrict without testing all frontend origins
- Proctoring logs (`_behavior_logs`) are in-memory in `interview.py` — lost on server restart
