# ProdAgent — AI Productivity Agent

A full-stack, multi-user AI productivity platform that combines intelligent chat agents, AI-powered scheduling, document analysis, and Google Calendar integration into a single cohesive application.

---

## 🚀 Features

- **Multi-Agent AI Chat** — Switch between Chat, Code, Writer, and Scheduler agents, or let Auto mode route your query intelligently
- **AI Scheduler** — Generate day-wise learning/productivity plans from a plain-text goal; supports start date, duration, gap days, and daily hours
- **Google Calendar Sync** — Premium users can sync generated schedules directly to their own Google Calendar (per-user OAuth, fully isolated)
- **Document Intelligence** — Upload PDFs and ask questions, generate summaries, or extract study notes using RAG (vector search + LLM)
- **Google Sign-In** — One-click login with Google (profile/email only); calendar access is a separate, explicit consent step
- **Multi-User Isolation** — Every user's chats, schedules, documents, and calendar tokens are strictly isolated in SQLite
- **Role-Based Access** — Three roles: `user`, `admin`, `super_admin`; admin dashboard with user management, usage analytics, and activity logs
- **Subscription Tiers** — Free and Premium plans; calendar sync and certain features are premium-gated
- **Session Management** — Token-based auth with 24-hour expiry; auto-refresh on every dashboard load

---

## 🧠 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                  │
│  Auth · Chat · Scheduler · Documents · Admin Panel  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼───────────────────────────────┐
│              FastAPI Backend (Python)                │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐   │
│  │ Agent Chain │  │  Scheduler   │  │  Doc (RAG) │   │
│  │ chat/code/  │  │  LLM + Web   │  │  Chroma +  │   │
│  │ writer/auto │  │  search      │  │ HuggingFace│   │
│  └─────────────┘  └──────────────┘  └────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │           SQLite  (db_manager.py)            │    │
│  │  users · sessions · chats · schedules ·      │    │
│  │  documents · activity_logs · google_tokens   │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │   Google APIs           │
          │  OAuth2 · Calendar v3   │
          └─────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Framer Motion |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| AI / LLM | LangChain, Groq (llama-3.1-8b-instant), HuggingFace Embeddings |
| Vector Store | ChromaDB (per-user, per-document) |
| Database | SQLite (via `sqlite3`, no ORM) |
| Auth | Custom token-based sessions + Google OAuth 2.0 |
| Calendar | Google Calendar API v3 |
| Package Manager | `uv` (Python), `npm` (Node) |

---

## 📂 Project Structure

```
AI_Productivity_Agent/
├── Backend/
│   ├── server.py              # FastAPI app — all routes
│   ├── db_manager.py          # SQLite Store class
│   ├── agents/
│   │   ├── agent_chain.py     # LangChain multi-agent chains
│   │   ├── scheduler.py       # Schedule extraction + Google Calendar
│   │   └── calendar_auth.py   # Legacy one-time OAuth helper
│   ├── pyFiles/
│   │   └── doc.py             # RAG pipeline (PDF → Chroma → LLM)
│   └── UploadedFiles/         # User-uploaded PDFs
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   ├── components/        # Reusable UI components
│   │   ├── store/             # Zustand state (auth, chat)
│   │   ├── lib/               # API client, validation, utils
│   │   └── types/             # Shared TypeScript types
│   └── package.json
├── credentials.json           # Google OAuth app credentials (not committed)
├── .env                       # Root env vars
└── pyproject.toml             # Python dependencies
```

---

## ⚙️ Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- `uv` package manager — [install guide](https://docs.astral.sh/uv/getting-started/installation/)
- A [Groq API key](https://console.groq.com/)
- A Google Cloud project with OAuth 2.0 credentials (Desktop app type) and Calendar API enabled

### 1. Clone & configure environment

```bash
git clone <repo-url>
cd AI_Productivity_Agent
```

Create `.env` in the root:

```env
GROQ_API_KEY=your_groq_api_key
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/oauth/callback
GOOGLE_LOGIN_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
OAUTHLIB_INSECURE_TRANSPORT=1
OAUTHLIB_RELAX_TOKEN_SCOPE=1
```

Place your `credentials.json` (Google OAuth Desktop app) in the project root.

### 2. Backend

```bash
# Install dependencies
uv sync

# Start the server
cd Backend
../.venv/Scripts/python.exe -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload
```

The database (`app_database.db`) is created automatically on first run with a default `super_admin` account.

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`.

### 4. Google Cloud Console setup

Add these to your OAuth 2.0 client's **Authorized redirect URIs**:

```
http://localhost:5000/api/auth/google/callback
http://localhost:5000/api/calendar/oauth/callback
```

---

## 🔗 API Overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/google` | Start Google login OAuth |
| GET | `/api/auth/google/callback` | Google login callback |
| POST | `/api/auth/logout` | Invalidate session |
| GET/POST | `/api/chats` | List / create chat sessions |
| POST | `/api/ai/chat` | Send message to AI agent |
| POST | `/api/ai/scheduler` | Generate AI schedule |
| POST | `/api/documents/upload` | Upload PDF |
| POST | `/api/ai/document/question` | Ask question about document |
| POST | `/api/schedules/{id}/sync/calendar` | Sync schedule to Google Calendar |
| GET | `/api/calendar/status` | Check calendar connection |
| GET | `/api/admin/stats` | Admin platform statistics |
| GET | `/api/admin/users` | List all users |

Full API docs available at `http://localhost:5000/docs` (FastAPI Swagger UI).

---


## 🚧 Future Improvements

- Email/password reset flow
- Rate limiting per user/tier
- Streaming AI responses (SSE)
- Mobile-responsive improvements
- Export schedules as `.ics` calendar files
- Support for more document types (DOCX, TXT)
- Webhook notifications for schedule reminders

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with clear messages
4. Open a pull request against `main`

Please keep PRs focused — one feature or fix per PR.

---

## 📜 License

MIT License. See `LICENSE` for details.## 👤 Author

**N Paavan Siri Vardhan**
📧 [naravapaavansirivardhan@gmail.com](mailto:naravapaavansirivardhan@gmail.com)

---

## 📜 License

MIT License. See `LICENSE` for details.