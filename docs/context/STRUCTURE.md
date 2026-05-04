# Structure

```
d:/vinay/Hire ai/
├── ARCHITECTURE.md                    — High-level system diagram
├── README.md                          — Project intro
├── .env                               — Root env (⚠️ contents unknown, backend/.env is canonical)
├── backend/
│   ├── requirements.txt               — Python dependencies
│   ├── .env                           — Backend secrets (OpenAI, SMTP, JWT)
│   ├── recruit.db                     — SQLite: candidates + jobs
│   ├── assessment_checkpoints.db      — LangGraph SQLite checkpointer
│   ├── chroma_db/                     — ChromaDB vector store files
│   ├── mock_resumes/{linkedin,naukri,indeed}/ — Mock PDFs for external matching
│   └── app/
│       ├── main.py                    — FastAPI app, CORS, router registration
│       ├── database.py                — SQLAlchemy engine, SessionLocal, Base
│       ├── api/
│       │   ├── auth.py                — Manager + candidate login endpoints
│       │   ├── jobs.py                — JD questions, generate, create, list
│       │   ├── candidates.py          — Upload resumes, vector+LLM match
│       │   ├── audio.py               — Whisper STT, OpenAI TTS endpoints
│       │   ├── assessment.py          — LangGraph assessment, SMTP invitations
│       │   ├── interview.py           — Turn-based chat, proctoring, HR report
│       │   ├── internal.py            — Bench employee listing + matching
│       │   ├── external.py            — External mock resume matching
│       │   └── budget.py              — Department budget approval lookup
│       ├── models/
│       │   ├── candidate.py           — Candidate ORM + credential generators
│       │   └── job.py                 — Job ORM
│       ├── services/
│       │   ├── ai_service.py          — JD + question generation (GPT-4o-mini)
│       │   ├── assessment_graph.py    — LangGraph topology + state
│       │   ├── llm_evaluator.py       — Resume scoring against JD
│       │   ├── mcp_router.py          — Domain detection + rubric selection
│       │   └── vector_store.py        — ChromaDB operations (embed, query)
│       ├── logic/interview_manager.py — Priya/Arjun/Rajesh persona orchestration
│       └── utils/media.py             — Whisper, TTS, video proctoring (vision)
└── frontend-react/
    ├── package.json                   — npm deps
    ├── vite.config.js                 — Dev proxy → backend
    ├── dist/                          — Built assets (do not edit)
    └── src/
        ├── App.jsx                    — React Router, auth guards
        ├── api/client.js              — Axios instance (baseURL '')
        ├── pages/
        │   ├── Login.jsx              — HR manager login
        │   ├── JDGenerator.jsx        — 3-step JD creation wizard
        │   ├── ResumeMatcher.jsx      — PDF upload + match results
        │   ├── Candidates.jsx         — HR dashboard, pipeline, internal recs
        │   ├── CandidateLogin.jsx     — Candidate portal auth
        │   ├── CandidateDashboard.jsx — 4-stage pipeline status view
        │   ├── Assessment.jsx         — 7-question assessment UI
        │   ├── AssessmentResult.jsx   — Score + reasoning display
        │   └── VideoInterview.jsx     — WebRTC + persona voice interview
        └── components/
            ├── AudioRecorder.jsx      — Mic capture, sends blob to parent
            ├── Layout.jsx             — HR app shell wrapper
            └── Sidebar.jsx            — HR nav sidebar
```
