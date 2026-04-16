# Hire AI — Project Context Reference

---

## 1. Project Overview

- **Hire AI** is an AI-powered HR recruitment automation platform
- Built for two portals: **Manager (HR) Portal** and **Candidate Portal**
- Manager portal handles JD creation, resume upload, resume matching, and candidate shortlisting
- Candidate portal handles personalized technical assessments based on resume-JD match
- Uses vector embeddings for resume matching, LLM for JD generation, and LangGraph for adaptive assessments
- Tech stack: React + FastAPI + SQLite + ChromaDB + OpenAI

---

## 2. Frontend Structure

### Key Folders and Components

- `frontend-react/src/`
  - `App.jsx` — Main routing setup with PrivateRoute auth guard
  - `components/Layout.jsx` — Shared state provider; wraps all HR portal pages via React Router `<Outlet>`
  - `components/Sidebar.jsx` — Navigation links for JD Generator, Resume Matcher, Candidates; includes logout
  - `components/AudioRecorder.jsx` — Mic recording + Whisper transcription for voice-based JD answers
  - `pages/Login.jsx` — HR login (hardcoded: admin / admin123)
  - `pages/JDGenerator.jsx` — AI mode (3-step: intent → Q&A → review) and Direct mode (manual form)
  - `pages/ResumeMatcher.jsx` — PDF upload + jobId input + match results display
  - `pages/Candidates.jsx` — Candidate registration, shortlisting, and status management
  - `pages/CandidateLogin.jsx` — Entry point for candidate portal
  - `pages/Assessment.jsx` — MCQ + short answer question UI for candidates
  - `pages/AssessmentResult.jsx` — Score and feedback display post-assessment
  - `api/client.js` — Axios instance; base URL is empty (uses Vite proxy to localhost:8000)

### How Navigation Works

- React Router v6 with nested routes
- HR portal flow: `/login` → `/jd` → `/match` → `/candidates`
- Candidate portal flow: `/candidate-login` → `/assessment` → `/assessment/result`
- `PrivateRoute` checks `hire_ai_auth` in localStorage to protect HR routes
- Sidebar links navigate between the three main HR pages without full page reload

---

## 3. Backend Overview

### APIs Involved

- `POST /jobs/questions` — Generate follow-up questions from a brief job intent
- `POST /jobs/generate` — Generate a structured JD from intent + answers
- `POST /jobs/create` — Save final JD to DB; returns `jobId`
- `POST /candidates/upload-files` — Upload PDF resumes; processes and stores in ChromaDB
- `GET /candidates/match/{job_id}` — Run full resume matching pipeline for a given jobId
- `POST /assessment/candidates/register` — HR registers a shortlisted candidate
- `POST /assessment/candidates/shortlist` — HR marks candidate as eligible for assessment
- `GET /assessment/candidates/list` — List all candidates with status and scores
- `POST /assessment/login` — Candidate authentication; returns JWT
- `GET /assessment/start` — Triggers LangGraph question generation for a candidate
- `POST /assessment/submit` — Submits candidate answers; runs LLM evaluation
- `POST /audio/transcribe` — Whisper-based audio-to-text
- `POST /audio/speak` — OpenAI TTS for text-to-speech

### How JD Generation Works

- AI mode: Manager provides a brief intent → backend generates 5 targeted follow-up questions → manager answers → backend generates a structured JD (title, description, required_skills, experience_level)
- Direct mode: Manager fills fields manually
- Final JD is saved to SQLite `jobs` table via `POST /jobs/create`; a `jobId` is returned

### How Resume Matching Works

- PDFs uploaded via `POST /candidates/upload-files`
  - Text extracted from PDFs, chunked (1000 chars), embedded using `text-embedding-3-small`, stored in ChromaDB
- Match triggered via `GET /candidates/match/{job_id}`
  - JD fetched from SQLite by jobId
  - JD embedded and used to query ChromaDB; top 5 unique resumes retrieved (deduplication by filename)
  - MCP router identifies the job domain from JD keywords (e.g., Computer Science, Mechanical)
  - Each resume evaluated by LLM using domain-specific scoring rubric
  - Results sorted by LLM `overall_score` descending and returned with vector score + LLM evaluation details

---

## 4. Core Flow

### JD Generation → jobId

- Manager enters job intent on JD Generator page
- AI mode: questions generated → manager answers (typed or voice) → JD generated and reviewed → saved
- Direct mode: form filled manually → saved immediately
- On save (`POST /jobs/create`), a `jobId` is returned and displayed to the manager

### Resume Matching → Results

- Manager uploads PDF resumes (drag & drop) on Resume Matcher page
- Manager enters the `jobId` from the previous step
- Clicks "Find Matches" → `GET /candidates/match/{job_id}` runs the full pipeline
- Results show: candidate name (filename), vector score (%), LLM overall score (0–100), green flags, red flags, missing skills, snippet

### Candidate Selection Logic

- HR reviews match results on Resume Matcher page
- Selects candidates to register → `POST /assessment/candidates/register` (status: "Applied")
- HR then shortlists them → `POST /assessment/candidates/shortlist` (status: "Shortlisted")
- Shortlisted candidates can log in to the candidate portal and take the assessment

### Navigation Flow

- HR: Login → JD Generator → Resume Matcher (with jobId) → Candidates (register & shortlist)
- Candidate: Candidate Login → Assessment (questions) → Assessment Result (score)

---

## 5. State Management

### Where State is Stored

- `Layout.jsx` holds shared state using React `useState` and passes it as props to child pages via React Router `<Outlet context>`
- `localStorage` holds persisted auth tokens and candidate session data
- Each page (JDGenerator, ResumeMatcher, Candidates) holds its own local transient UI state

### What Data is Shared (via Layout.jsx context)

- `matcherJobId` / `setMatcherJobId` — The jobId entered in Resume Matcher; persists across tab switches
- `matcherResults` / `setMatcherResults` — The match results returned from the API; persists across tab switches
- `matcherUploaded` / `setMatcherUploaded` — Flag indicating resumes have been uploaded and processed

### localStorage Keys

- `hire_ai_auth` — HR login flag (boolean)
- `candidate_token` — JWT for candidate portal
- `candidate_id`, `candidate_name` — Candidate session context
- `assessment_result` — Final score and feedback for result display

### Transient State (lost on navigation)

- JDGenerator: current step, intent text, questions, answers, generated JD preview
- ResumeMatcher: file list, uploading flag, matching flag
- Candidates: form modal open/close state

---

## 6. Current Issues

### State Resets on Tab Switch

- When a user navigates away from Resume Matcher and returns, the file list and upload/match UI state are reset
- Root cause: file array and upload/matching flags are local `useState` inside ResumeMatcher; they re-initialize on component unmount/remount
- Partial mitigation: core data (jobId, results, uploaded flag) is stored in Layout.jsx context and survives tab switches
- Remaining gap: file list and in-progress upload state are still lost; user must re-select files if they navigate away mid-upload

### Other Known Limitations

- HR authentication is a demo stub — no real backend validation (admin/admin123 hardcoded)
- No deduplication of uploaded PDF files; same file uploaded twice creates a separate entry in ChromaDB under the same source name
- Domain routing for hybrid job roles (e.g., both software and mechanical keywords) picks the first matching domain and may evaluate incorrectly
- LangGraph assessment checkpoints accumulate in SQLite with no expiry or cleanup mechanism
- JWT `SECRET_KEY` has a hardcoded fallback; not production-safe
- Resume text is capped at 3000 characters in the assessment graph to avoid LLM token overflow; very long resumes may lose tail content

---

## 7. Important Notes

### Assumptions

- PDF filenames are treated as unique candidate identifiers in the vector store; same filename = same candidate
- A job belongs to exactly one domain; domain is determined by first keyword match in MCP router
- LLM match score and vector score together represent the candidate's overall fit; no additional signals used
- Candidate status must be exactly "Shortlisted" to access the assessment; "Applied" or "Assessed" statuses are blocked

### Constraints

- Assessment questions are generated once per candidate (LangGraph graph is interrupted after `question_generator` node and resumed on submit)
- Adaptive difficulty is binary: `match_score >= 70` → architectural/deep questions; `< 70` → foundational questions
- Audio recording uses browser MediaRecorder API; file is sent to backend for Whisper transcription
- Vite dev server proxies all `/jobs`, `/candidates`, `/assessment`, `/audio` paths to FastAPI on port 8000

### Special Logic

- Vector search over-fetches (top_n × 4 results) and then deduplicates by resume source filename to ensure top-N results are from distinct candidates
- LangGraph uses SQLite checkpointer (`assessment_checkpoints.db`) with `thread_id = candidate_id` to persist assessment state between start and submit calls
- LLM temperature is set to 0.3 for JD generation and assessment to reduce randomness while retaining variety
- Domain-specific system prompts in `mcp_router.py` include a four-tier scoring rubric (85–100 Exceptional, 70–84 Strong, 50–69 Average, 0–49 Reject)
