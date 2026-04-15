# 🚀 Autonomous HR Recruiting Engine
> **Shifting talent acquisition from passive searching to an autonomous, skills-first execution engine.**

Currently, enterprise hiring requires 10 hours of manual administration per lead and stretches time-to-hire to 45 days. This project eliminates the bottleneck by deploying 24/7 AI agents to proactively hunt, validate, and interview candidates — ensuring only highly verified talent reaches human managers.

### 🏆 Projected Business Impact
* **Velocity:** Time-to-hire reduced from 45 Days → 12 Days.
* **Quality:** 90% Skill-Match Accuracy via autonomous multi-modal validation.
* **Security:** 100% Data Sovereignty and zero PII leakage using MCP.

---

## 🏗️ Enterprise-Grade Architecture
We built this with a strict separation of concerns, ensuring deterministic logistics and probabilistic reasoning remain isolated.

* **n8n (The Muscle):** Orchestrates logistics, webhooks, resume fetching, and routing.
* **LangGraph (The Brain):** Manages stateful memory and dynamic multi-turn technical interviews.
* **MCP (The Shield):** Securely bridges the LLM to our proprietary databases (zero PII leakage).
* **Vector DB (The Memory):** Contextual similarity search for skill mapping.
* **Flask / Python:** Core backend and API routing.

---

## 💻 Local Development Setup (For the Team)

**1. Clone the repository**
\`\`\`bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
\`\`\`

**2. Branching Strategy**
Do **not** push directly to `main`. Create your branch before coding:
* Backend: `git checkout -b backend-dev`
* Frontend: `git checkout -b frontend-dev`

**3. Environment Variables**
Ask the Team Lead for the `.env` file. **Never push this file to GitHub.** Place it in the root directory. It contains the database credentials, LLM keys, and MCP configurations.

### 🔌 Application Port Mapping
To avoid localhost conflicts, the team must run applications on these designated ports:

| Service | Technology | Port | Local URL |
| :--- | :--- | :--- | :--- |
| **Backend API** | Flask | `5000` | `http://localhost:5000` |
| **Frontend UI** | React / Streamlit | `3000` / `8501` | `http://localhost:3000` |
| **Orchestrator** | n8n | `5678` | `http://localhost:5678` |
| **Vector DB** | Qdrant / Chroma (Local) | `6333` / `8000` | `http://localhost:6333` |

---
*Built with ❤️ during [Hackathon Name]*
