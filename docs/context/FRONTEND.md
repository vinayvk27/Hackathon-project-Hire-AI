# Frontend

## Routes (`frontend-react/src/App.jsx`)

| Path | Component | Guard | Notes |
|------|-----------|-------|-------|
| `/login` | `Login.jsx` | None | HR manager login |
| `/` | redirect | `hire_ai_auth` | → `/jd` if authed |
| `/jd` | `JDGenerator.jsx` | `hire_ai_auth` | 3-step JD wizard |
| `/match` | `ResumeMatcher.jsx` | `hire_ai_auth` | PDF upload + match |
| `/candidates` | `Candidates.jsx` | `hire_ai_auth` | HR pipeline dashboard |
| `/candidate-login` | `CandidateLogin.jsx` | None | Candidate portal |
| `/dashboard` | `CandidateDashboard.jsx` | `candidate_token` | 4-stage status view |
| `/assessment` | `Assessment.jsx` | `candidate_token` | 7-question MCQ+short |
| `/assessment/result` | `AssessmentResult.jsx` | `candidate_token` | Score + reasoning |
| `/interview` | `VideoInterview.jsx` | `candidate_token` + status check | Allowed: Shortlisted, Assessed, Tech_Done |

## Design System

- TailwindCSS utility-first — no external component library
- No global CSS variables; colors inline as Tailwind classes
- Score color helper: `scoreColor(v)` in `Candidates.jsx` — green ≥80, amber ≥60, red <60
- Layout shell: `components/Layout.jsx` wraps HR pages; candidate pages are standalone
- Sidebar: `components/Sidebar.jsx` — HR nav only

## API Client (`frontend-react/src/api/client.js`)

- Axios instance, `baseURL: ''`
- All requests go through Vite dev proxy → `http://localhost:8000`
- No global auth interceptor; candidate JWT added per-request as `Authorization: Bearer <token>`
- File uploads use `multipart/form-data` (set per call, not globally)

## localStorage Keys

| Key | Type | Set By | Purpose |
|-----|------|--------|---------|
| `hire_ai_auth` | `"true"` | `Login.jsx` | HR manager session flag |
| `candidate_token` | JWT string | `CandidateLogin.jsx` | Candidate API auth bearer |
| `candidate_id` | integer string | `CandidateLogin.jsx` | Candidate DB row id |
| `candidate_name` | string | `CandidateLogin.jsx` | Display name in UI |
| `candidate_status` | string | `CandidateLogin.jsx` | Pipeline status (from `deriveStatus()`) |
| `assessment_result` | JSON string | `Assessment.jsx` | Score + reasoning (from `/assessment/submit`) |

## Key Frontend Utilities

| Function | File | Purpose |
|----------|------|---------|
| `deriveStatus(candidateStatus, interviewStatus)` | `CandidateDashboard.jsx` | Collapse two DB fields into single pipeline label |
| `stageState(stage, currentStatus)` | `CandidateDashboard.jsx` | Returns `'locked'` / `'active'` / `'done'` per stage |
| `scoreColor(value)` | `Candidates.jsx` | Tailwind class for score threshold colouring |

## Component Notes

- `AudioRecorder.jsx` — captures mic blob, exposes `onAudioReady(blob)` callback; used by `VideoInterview.jsx`
- `VideoInterview.jsx` — owns MediaRecorder + WebRTC stream; sends video blob + audio blob per turn to `/interview/chat`
- `Assessment.jsx` — fetches questions on mount via `GET /assessment/start` using `candidate_token` JWT
