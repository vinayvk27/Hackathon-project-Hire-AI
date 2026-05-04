# Flows

## 1. HR Manager Creates a Job Description

1. Manager enters intent text → `JDGenerator.jsx` POST `/jobs/questions`
2. `jobs.get_jd_questions` → `ai_service.generate_jd_questions()` → GPT-4o-mini returns 5 questions
3. Manager answers questions → POST `/jobs/generate`
4. `jobs.generate_jd` → `ai_service.generate_structured_jd()` → JSON (title, description, skills, level)
5. Manager confirms → POST `/jobs/create` → `jobs.create_job` → INSERT into `jobs` table

## 2. Resume Upload & Auto-Shortlisting

1. Manager drops PDFs → `ResumeMatcher.jsx` POST `/candidates/upload-files` (multipart)
2. `candidates.upload_resume_files` → `VectorStoreService.process_and_store_resumes()` → PyPDF2 → chunk → `text-embedding-3-small` → ChromaDB
3. Manager clicks match → GET `/candidates/match/{job_id}`
4. `candidates.match_candidates` → `VectorStoreService.find_best_matches(jd_text, top_n=5)` → cosine top-5
5. For each: `evaluate_candidate(resume_text, jd_text, system_prompt)` via `llm_evaluator.py` → score 0–100
6. Top-3 candidates with score ≥50 → INSERT into `candidates` (status=`Shortlisted`, credentials generated via `generate_candidate_credentials()`)

## 3. Candidate Assessment (LangGraph)

1. Candidate logs in → `CandidateLogin.jsx` POST `/auth/login` → JWT stored in `localStorage.candidate_token`
2. Candidate clicks Start → `Assessment.jsx` GET `/assessment/start` (JWT header)
3. `assessment.start_assessment` → `assessment_graph.py:question_generator` → 7 questions (3 MCQ + 4 short); graph pauses at INTERRUPT
4. Candidate submits answers → POST `/assessment/submit` (JWT)
5. `assessment.submit_assessment` → `assessment_graph.py:technical_evaluator` → score + reasoning → UPDATE `candidates.technical_score`, `candidates.status = 'Assessed'`
6. Result JSON stored in `localStorage.assessment_result` → `AssessmentResult.jsx` renders it

## 4. Voice Interview Pipeline (3 Rounds)

1. Candidate enters interview → `VideoInterview.jsx` starts webcam + mic (MediaRecorder)
2. Each turn: audio blob + video blob → POST `/interview/chat` (form: `candidate_id, turn, audio_file, video_file`)
3. `interview.interview_chat` → `get_next_response(candidate_id, transcript, db)` in `interview_manager.py`
   - Turn routes by `candidate.interview_status`:
     - `Pending_Screening` → Priya (nova voice); detects `[INTERVIEW_COMPLETE]` → set `Screening_Done`
     - `Screening_Done` + `status=Assessed` → Arjun (onyx voice); detects complete → set `Tech_Done`
     - `Tech_Done` → Rajesh (echo voice); detects complete → `Interview_Complete` + `_run_summary_analysis()`
4. `media.transcribe_audio()` (Whisper) → text; `media.generate_audio()` (TTS-1-HD) → base64 MP3 returned
5. Background thread: `background_behavior_analysis(video_bytes, sid, turn, logs)` in `media.py` — 5 frames → GPT-4o-mini vision

## 5. HR Report & Video Proctoring Summary

1. HR opens report modal → `Candidates.jsx` GET `/interview/report/{candidate_id}`
2. `interview.get_interview_report` → reads `_behavior_logs[candidate_id]` (in-memory) + `candidate.proctoring_score`
3. GPT-4o-mini summarises behaviour logs → recommendation string
4. Returns: `{candidate_id, name, interview_status, ai_summary, proctoring_logs[], proctoring_score, recommendation}`
