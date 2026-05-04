# Environment Variables

File: `backend/.env`

| Variable | File | Purpose | Required? |
|----------|------|---------|-----------|
| `OPENAI_API_KEY` | `backend/.env` | GPT-4o-mini, Whisper, TTS, embeddings | Yes |
| `GOOGLE_API_KEY` | `backend/.env` | ⚠️ Not observed in active code — may be unused | No |
| `GROQ_API_KEY` | `backend/.env` | ⚠️ Not observed in active code — may be unused | No |
| `SMTP_EMAIL` | `backend/.env` | Gmail sender address for candidate invitations | Yes (if using notify) |
| `SMTP_PASSWORD` | `backend/.env` | Gmail App Password for SMTP auth | Yes (if using notify) |
| `SECRET_KEY` | `backend/.env` | JWT signing secret (HS256) | No (defaults to `hire-ai-candidate-secret-change-in-prod`) |

## Frontend

| Variable | File | Purpose | Required? |
|----------|------|---------|-----------|
| ⚠️ None declared | `frontend-react/` | No `VITE_*` env vars found in source | — |

## Notes

- Vite proxy in `frontend-react/vite.config.js` hardcodes backend URL — change it there, not via env
- `SECRET_KEY` default is insecure; override in production
