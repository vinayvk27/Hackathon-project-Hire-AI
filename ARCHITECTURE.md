# Hire AI — End-to-End System Architecture

> Ground truth for generating the master flow diagram. Covers the Manager/HR setup funnel and the full Candidate Interview pipeline.

---

## Phase 1: Manager Setup & Resume Processing (Top of Funnel)

### 1A. Job Description Creation

```
Manager speaks/types intent
        │
        ▼
POST /jobs/questions
  GPT-4o-mini → 5 clarifying questions (JSON)
        │
        ▼
Manager answers (typed OR voice-recorded)
        │
        ▼  [Voice path]
AudioRecorder (MediaRecorder API)
  → POST /audio/transcribe
  → Whisper-1 (OpenAI) → transcribed text
        │
        ▼
POST /jobs/generate
  {intent + answers} → GPT-4o-mini (JD_GENERATION_PROMPT)
  → Structured JD: { title, description, required_skills[], experience_level }
        │
        ▼
POST /jobs/create → SQLite: jobs table
```

TTS also reads questions aloud to the Manager via `POST /audio/speak` → `tts-1-hd` / voice `alloy` / MP3 base64.

---

### 1B. Resume Parsing & Vector Matching Engine

```
Manager uploads PDFs
        │
        ▼
VectorStoreService.process_and_store_resumes()
  ├── PyPDF2 → raw text per PDF
  ├── Chunk at 1000-char boundaries
  ├── OpenAI text-embedding-3-small → embeddings per chunk
  └── ChromaDB (PersistentClient, ./chroma_db)
        collection: "resumes", cosine space
        IDs: {filename}_{chunk_index}
        │
        ▼
GET /candidates/match/{job_id}
  ├── Assemble JD text → embed via text-embedding-3-small
  ├── ChromaDB query (n_results = top_n × 4, over-fetch)
  ├── Deduplicate: best chunk score per filename
  ├── vector_score = round(1 - cosine_distance, 4)
  │
  ├── route_jd_intent(jd_text) → domain keyword scan → 1 of 7 domains
  ├── get_system_prompt_by_domain() → rubric prompt
  ├── llm_evaluator.evaluate_candidate(resume, jd, rubric_prompt)
  │     GPT-4o-mini → {
  │       overall_score (0–100),
  │       alignment_metrics,
  │       green_flags,
  │       red_flags,
  │       missing_required_skills,
  │       technical_depth_critique
  │     }
  │
  └── Top 3 candidates auto-registered in SQLite
        candidates.match_score = llm.overall_score
        candidates.status      = "Shortlisted"
        credentials: {username}@hire.ai / random 8-char password
```

---

## Phase 2: The Candidate Interview Pipeline

### Overall Status Lifecycle

```
Shortlisted
    │  Stage 1: Priya (voice screening)
    ▼
Screening_Done
    │  Stage 2: LangGraph Written Assessment
    ▼
Assessed  (candidates.status = "Assessed", technical_score saved)
    │  Stage 3: Arjun (technical voice interview)
    ▼
Tech_Done  (interview_status = "Tech_Done")
    │  Stage 4: Rajesh (final/director round)
    ▼
Interview_Complete  → reasoning_summary generated
```

---

### Stage 1 — Priya (HR Screening)

- **Persona:** Warm Chennai-based HR, voice `nova` (TTS)
- **Trigger:** `interview_status == "Pending_Screening"` or `"Shortlisted"`
- **Goal:** Introductions, background check, CTC, notice period, work mode/location (5 tasks)
- **Endpoint:** `POST /interview/chat` (multipart: audio_file, video_file, candidate_id, turn)
- **Turn loop:**
  ```
  Audio blob → Whisper-1 (Indian English prompt) → transcript
  [system: PRIYA_SYSTEM] + screening_audio_log → GPT-4o-mini (temp 0.7, max 400 tokens)
  → reply text → TTS (nova) → base64 MP3
  ```
- **Completion:** GPT-4o-mini emits `[INTERVIEW_COMPLETE]` sentinel → `interview_status = "Screening_Done"`
- **Persistence:** `candidates.screening_audio_log` (JSON list of `{role, content}`)

---

### Stage 2 — LangGraph Written Assessment

**Graph topology:**
```
START → question_generator ──[INTERRUPT]──► technical_evaluator → END
```

**State:** `{candidate_id, job_id, resume_text, job_description, match_score, assessment_questions, assessment_answers, technical_score, reasoning_summary, current_step}`

**Checkpointer:** `SqliteSaver` → `./assessment_checkpoints.db`; thread key = `str(candidate_id)`

**Step A — Question Generation** (`GET /assessment/start`):
- `match_score >= 70` → architectural/trade-off questions
- `match_score < 70` → foundational questions
- GPT-4o-mini (temp 0.3) → exactly **7 questions: 3 MCQ + 4 short answer**
- Graph pauses at `interrupt_after=["question_generator"]`; `correct_answer` stripped before sending to candidate

**Step B — Evaluation** (`POST /assessment/submit`):
- `update_state()` injects `assessment_answers` → graph resumes at `technical_evaluator`
- GPT-4o-mini (temp 0.1) → `{technical_score (0–100), reasoning_summary (3–5 sentences)}`
- Saved to `candidates.technical_score`, `candidates.reasoning_summary`, `candidates.status = "Assessed"`

---

### Stage 3 — Arjun (Technical Round)

- **Persona:** Sharp Bangalore engineer, voice `onyx`
- **Trigger:** `interview_status == "Screening_Done"` AND `candidates.status == "Assessed"`
- **Context injection:** `_arjun_system_with_jd()` prepends job title/skills + Priya's full conversation to system prompt
- **Goal:** 3 JD-mapped technical questions + 1 system design question
- **Turn loop:** identical to Priya (Whisper → GPT-4o-mini → TTS)
- **Guard:** Won't complete in fewer than 6 history entries (< 3 Q&A pairs)
- **Completion:** emits `[INTERVIEW_COMPLETE]` → `interview_status = "Tech_Done"`; history sealed with `[ARJUN_ROUND_COMPLETE]` marker
- **Persistence:** first section of `candidates.tech_audio_log` (before the marker)

---

### Stage 4 — Rajesh (Final / Director Round)

- **Persona:** Director of Engineering, voice `echo`
- **Trigger:** `interview_status == "Tech_Done"`
- **Context injection:** `_rajesh_system_with_notes()` appends JD + Priya history + Arjun history to system prompt
- **Goal:** 3 behavioral questions — ownership, ambiguity, cross-functional collaboration
- **Turn loop:** same Whisper → GPT-4o-mini → TTS pipeline
- **Completion:** emits `[INTERVIEW_COMPLETE]` → `interview_status = "Interview_Complete"` → triggers `_run_summary_analysis()`:
  - GPT-4o-mini reads all 3 rounds' transcripts → 5–7 bullet debrief stored in `candidates.reasoning_summary`
- **Persistence:** second section of `candidates.tech_audio_log` (after the `[ARJUN_ROUND_COMPLETE]` marker, split by `_split_tech_log()`)

---

### Cross-Stage Context Propagation

| Receiving Agent | Context Injected |
|---|---|
| Arjun | Job title, required skills, full Priya conversation |
| Rajesh | Job title, required skills, Priya conversation, Arjun conversation |
| LangGraph Evaluator | resume_text (≤3000 chars), job_description, match_score |
| Final Summary | All 3 audio logs concatenated |

---

## Phase 3: Core Tech Stack & Data Flow

| Layer | Technology | Role |
|---|---|---|
| Frontend | React 18 + Vite (port 5173) | Candidate/HR UI |
| Backend | FastAPI (port 8000) | REST API + orchestration |
| Primary DB | SQLite (`recruit.db`) via SQLAlchemy | All structured state |
| Graph checkpoints | SQLite (`assessment_checkpoints.db`) | LangGraph state snapshots |
| Vector DB | ChromaDB (`./chroma_db`) | Resume embeddings |
| Orchestration | LangGraph (interrupt/resume pattern) | Written assessment graph |
| LLM | GPT-4o-mini (OpenAI) | All generation + evaluation |
| Embeddings | `text-embedding-3-small` (OpenAI) | Resume/JD vector search |
| Speech-to-Text | Whisper-1 (OpenAI) | Candidate audio transcription |
| Text-to-Speech | `tts-1-hd` (OpenAI) | Persona voice replies |
| PDF parsing | PyPDF2 | Resume text extraction |

---

## Phase 4: Real-Time Subsystems

### 4A. Video Proctoring

```
React <video> (webcam stream, live display)
    │
    ├── Periodic: setInterval every 30,000 ms
    │     └── captureAndSendSnapshot()
    │           ctx.drawImage(video → hidden <canvas>)
    │           canvas.toBlob(jpeg, quality=0.7)
    │           POST /interview/analyze?sid={candidateId}&turn={turn}
    │
    └── Per-turn: attached as video_file in POST /interview/chat
            │
            ▼
  background_behavior_analysis()  [daemon thread, non-blocking]
    ├── Write bytes to tempfile (.webm)
    ├── cv2.VideoCapture → sample up to 5 evenly-spaced frames
    ├── cv2.imencode → JPEG → base64
    └── GPT-4o-mini vision (detail: "low")
          → detect: looking away / multiple people /
                    phone / reading notes / absent
          → append observation to _behavior_logs[sid]

GET /interview/report/{candidate_id} → { proctoring_logs[], proctoring_score }
```

### 4B. Audio Chat

```
Candidate clicks "Talk"
    │
    ▼
getUserMedia({ audio: true })
MediaRecorder.start()
  → chunks collected in audioChunksRef
MediaRecorder.stop()
  → Blob(chunks, { type: "audio/webm;codecs=opus" })
    │
    ▼
FormData: audio_file + video_file (JPEG snapshot) + candidate_id + turn
POST /interview/chat
    │
    ▼  [Backend: transcribe_audio()]
BytesIO wrapper (.name = "audio.webm")
Whisper-1 (language="en", Indian English prompt)
→ transcript string
    │
    ▼  [Backend: get_next_response()]
[system_prompt] + conversation_history + {role:"user", content:transcript}
GPT-4o-mini (temp 0.7, max_tokens 400)
→ reply text
    │
    ▼  [Backend: generate_audio()]
Strip markdown → tts-1-hd (voice per persona, speed 0.95) → MP3 base64
    │
    ▼  [Frontend]
new Audio("data:audio/mp3;base64,…").play()
onended → phase transitions back to "idle"
```

---

## Phase 5: State Management & Admin Dashboard

### SQLite as Single Source of Truth

**`jobs` table:** `{id, title, description, required_skills (JSON), experience_level}`

**`candidates` table (key fields):**

| Field | Type | Source |
|---|---|---|
| `match_score` | Float | LLM `overall_score` from resume matching (0–100) |
| `status` | String | `Applied → Shortlisted → Assessed → Rejected` |
| `technical_score` | Integer | LangGraph `technical_evaluator` (0–100) |
| `interview_status` | String | `Pending_Screening → Screening_Done → Tech_Done → Interview_Complete` |
| `screening_audio_log` | JSON text | Priya conversation history |
| `tech_audio_log` | JSON text | Arjun + `[ARJUN_ROUND_COMPLETE]` + Rajesh history |
| `reasoning_summary` | Text | LLM assessment eval + post-interview debrief |
| `proctoring_score` | Float | 0.0–1.0 from vision analysis |

### `deriveStatus()` — Unified Pipeline View

```javascript
// frontend-react/src/pages/CandidateDashboard.jsx
function deriveStatus(candidateStatus, interviewStatus) {
  if (interviewStatus === 'Interview_Complete' || interviewStatus === 'Tech_Done') return 'Tech_Done'
  if (interviewStatus === 'Screening_Done' && candidateStatus === 'Assessed')      return 'Assessed'
  if (interviewStatus === 'Screening_Done')                                         return 'Screening_Done'
  if (candidateStatus  === 'Shortlisted')                                           return 'Shortlisted'
  return candidateStatus || 'Shortlisted'
}
```

Collapses `candidates.status` + `candidates.interview_status` into a single pipeline position string.

**`STATUS_ORDER`:** `['Shortlisted', 'Screening_Done', 'Assessed', 'Tech_Done', 'Hired', 'Rejected']`

### HR Admin Dashboard (`/candidates`)

- Polls `GET /assessment/candidates/list` → all candidates for a job
- Renders pipeline stage cards using `deriveStatus()` result
- Displays: `match_score`, `technical_score`, `reasoning_summary`, proctoring flags
- Stage card lock/active/done state computed by comparing `STATUS_ORDER` index of current vs. stage threshold

### Candidate Self-Serve Dashboard (`/dashboard`)

- Stage 1 "Screening Call" → active when `Shortlisted` → routes `/interview` (Priya)
- Stage 2 "Technical Assessment" → active when `Screening_Done` → routes `/assessment` (LangGraph)
- Stage 3 "Technical Round" → active when `Assessed` → routes `/interview` (Arjun)
- Stage 4 "Final HR & Offer" → active when `Tech_Done` → routes `/interview` (Rajesh)

`VideoInterview.jsx` maps status → active persona via `STATUS_TO_PERSONA`:
```
Shortlisted → Priya  |  Assessed → Arjun  |  Tech_Done → Rajesh
```

---

## Master Flow Summary

```
Manager
  └─ Audio/Text → Whisper/GPT-4o-mini → Structured JD → SQLite
  └─ PDF Resumes → PyPDF2 → Chunked Embeddings → ChromaDB
                            └─ JD Embed → Cosine Match → LLM Score
                                          └─ Top 3 Auto-Registered → SQLite (Shortlisted)

Candidate (Shortlisted)
  └─ Stage 1: POST /interview/chat → Whisper → Priya (GPT-4o-mini) → TTS
              Canvas snapshots → Vision proctoring (background thread)
              → interview_status: Screening_Done

  └─ Stage 2: GET /assessment/start → LangGraph question_generator (GPT-4o-mini, adaptive)
              POST /assessment/submit → LangGraph technical_evaluator → score + summary
              → candidates.status: Assessed

  └─ Stage 3: POST /interview/chat → Whisper → Arjun (GPT-4o-mini + JD + Priya context) → TTS
              → interview_status: Tech_Done

  └─ Stage 4: POST /interview/chat → Whisper → Rajesh (GPT-4o-mini + all context) → TTS
              → interview_status: Interview_Complete
              → _run_summary_analysis() → reasoning_summary (5–7 bullets)

HR Dashboard
  └─ GET /assessment/candidates/list → deriveStatus() → pipeline view
     match_score | technical_score | reasoning_summary | proctoring_logs
```
