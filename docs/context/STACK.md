# Stack

## Frontend

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| Framework | React | 18 |
| Build | Vite | — |
| Styling | TailwindCSS | utility-first, no component lib |
| HTTP | Axios | baseURL `''` (Vite proxy) |
| Router | React Router | v6 |

## Backend

| Layer | Technology | Notes |
|-------|-----------|-------|
| API | FastAPI | Python, async |
| ORM | SQLAlchemy | SQLite, `check_same_thread=False` |
| Graph | LangGraph | Stateful assessment orchestration |
| Vector DB | ChromaDB | Persistent, local `backend/chroma_db/` |
| LLM | OpenAI `gpt-4o-mini` | JD gen, evaluation, interviews, proctoring |
| Embeddings | `text-embedding-3-small` | Resume + JD vectorization |
| STT | OpenAI Whisper-1 | Audio transcription |
| TTS | OpenAI TTS-1-HD | Voice synthesis (alloy/nova/onyx/echo) |
| PDF | PyPDF2 | Resume text extraction |
| Auth | PyJWT (HS256) | Candidate portal, 8h expiry |
| Email | smtplib (SMTP) | Gmail App Password |

## Infrastructure / Runtime

| Item | Detail |
|------|--------|
| Database | SQLite `backend/recruit.db` |
| Checkpoints | SQLite `backend/assessment_checkpoints.db` |
| Vector store | ChromaDB files `backend/chroma_db/` |
| Dev server | Vite dev (port 5173), FastAPI uvicorn (port 8000) |
| Vite proxy | All frontend `/api`, `/auth`, `/jobs`, etc. → `http://localhost:8000` |
| Mock resumes | `backend/mock_resumes/linkedin/`, `naukri/`, `indeed/` |
