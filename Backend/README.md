# Backend — ProdAgent API

FastAPI backend powering the ProdAgent platform. Handles authentication, multi-agent AI, scheduling, document RAG, Google Calendar OAuth, and admin operations — all backed by a local SQLite database.

---

## Architecture

The backend follows a flat modular structure — no ORM, no service layer abstraction. Logic is split across three areas:

```
server.py          → All HTTP routes (single file, ~700 lines)
db_manager.py      → SQLite Store class (all DB operations)
agents/
  agent_chain.py   → LangChain multi-agent routing + tool execution
  scheduler.py     → Schedule extraction, Google Calendar OAuth + event creation
pyFiles/
  doc.py           → PDF RAG pipeline (load → chunk → embed → query → LLM)
```

**Request flow:**
```
Client → FastAPI route → get_current_user() (token validation)
       → Agent / Scheduler / Doc function
       → Store (SQLite read/write)
       → Response
```

---

## Tech Stack

| Component | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| Language | Python 3.11+ |
| Database | SQLite (`sqlite3` stdlib) |
| LLM | Groq API (`llama-3.1-8b-instant`) via LangChain |
| Embeddings | HuggingFace `sentence-transformers/all-MiniLM-L6-v2` |
| Vector Store | ChromaDB (local, per-user directories) |
| Auth | Custom bearer tokens + bcrypt password hashing |
| Google | `google-auth-oauthlib`, `google-api-python-client` |
| HTTP client | `httpx` (async, for Google userinfo fetch) |
| Package manager | `uv` |

---

## Folder Structure

```
Backend/
├── server.py              # FastAPI app + all route handlers
├── db_manager.py          # Store class — all SQLite CRUD
├── agents/
│   ├── agent_chain.py     # chat/code/writer/auto chains + tools
│   ├── scheduler.py       # Context extraction, schedule gen, Calendar OAuth
│   └── calendar_auth.py   # Legacy one-time CLI auth helper (unused in prod)
├── pyFiles/
│   └── doc.py             # PDF loader, Chroma vector store, RAG query
├── UploadedFiles/         # Uploaded PDFs (runtime, gitignored)
├── vector_store/          # Chroma DBs per user/document (runtime, gitignored)
└── app_database.db        # SQLite database (runtime, gitignored)
```

---

## API Endpoints

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Email + password login |
| POST | `/api/auth/register` | — | Register new user (auto-login) |
| GET | `/api/auth/me` | ✅ | Get current user from token |
| PATCH | `/api/auth/profile` | ✅ | Update display name |
| POST | `/api/auth/logout` | ✅ | Delete session |
| GET | `/api/auth/google` | — | Redirect to Google OAuth (login) |
| GET | `/api/auth/google/callback` | — | Google login callback → issues session |

### Chats

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/chats` | ✅ | List user's chat sessions |
| POST | `/api/chats` | ✅ | Create new chat session |
| GET | `/api/chats/{id}` | ✅ | Get single chat with messages |
| DELETE | `/api/chats/{id}` | ✅ | Delete chat |
| POST | `/api/chats/{id}/messages` | ✅ | Append message to chat |
| PATCH | `/api/chats/{id}/messages/{msg_id}` | ✅ | Edit message content |
| DELETE | `/api/chats/{id}/messages/{msg_id}` | ✅ | Delete message |
| POST | `/api/chats/sync` | ✅ | Upsert chat from frontend |

### AI

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/chat` | ✅ | Send message to selected agent (multipart/form-data) |
| POST | `/api/ai/scheduler` | ✅ | Generate AI schedule from goal |
| POST | `/api/ai/document/question` | ✅ | Ask question about uploaded document |
| POST | `/api/ai/document/summarize` | ✅ | Summarize document |
| POST | `/api/ai/document/notes` | ✅ | Generate study notes from document |

**`/api/ai/chat` form fields:**

| Field | Type | Description |
|---|---|---|
| `message` | string | User message |
| `agent` | string | `chat` \| `code` \| `writer` \| `scheduler` \| `auto` |
| `file` | file (optional) | PDF to include as context |
| `chatId` | query param | Target chat session ID |

### Schedules

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/schedules` | ✅ | List user's schedules |
| POST | `/api/schedules/{id}/sync/calendar` | ✅ | Sync schedule to Google Calendar |

### Documents

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/documents` | ✅ | List user's documents |
| POST | `/api/documents/upload` | ✅ | Upload PDF |
| GET | `/api/documents/{id}/view` | ✅ | Stream document file |

### Google Calendar

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/calendar/status` | ✅ | Check if user has connected calendar |
| GET | `/api/calendar/connect` | ✅ (premium) | Get OAuth URL for calendar connection |
| GET | `/api/calendar/oauth/callback` | — | Calendar OAuth callback |
| DELETE | `/api/calendar/disconnect` | ✅ | Remove user's calendar tokens |

### Admin

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/stats` | admin | Platform stats (users, sessions, revenue) |
| GET | `/api/admin/users` | admin | List all users |
| GET | `/api/admin/user-details` | admin | Users enriched with usage counts |
| PATCH | `/api/admin/users/{id}` | admin | Update user role/subscription |
| DELETE | `/api/admin/users/{id}` | admin | Delete user |
| POST | `/api/admin/users/{id}/upgrade` | admin | Upgrade user to premium |
| GET | `/api/admin/activity` | admin | All activity logs |
| GET | `/api/admin/users/{id}/activity` | admin | Activity logs for one user |
| GET | `/api/admin/usage-trends` | admin | 7-day usage trend data |
| GET | `/api/admin/model-usage` | admin | Per-agent usage breakdown |

---

## Database Schema

All tables use `CREATE TABLE IF NOT EXISTS` — data is never dropped on restart.

```sql
users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT,           -- "user" | "admin" | "super_admin"
  subscription TEXT,   -- "free" | "premium"
  createdAt TEXT,
  password_hash TEXT
)

sessions (
  token TEXT PRIMARY KEY,
  userId TEXT,
  createdAt TEXT,
  expiresAt TEXT       -- 24h from creation
)

chats (
  id TEXT PRIMARY KEY,
  ownerUserId TEXT,
  data TEXT            -- JSON blob: {id, title, messages[], updatedAt}
)

schedules (
  id TEXT PRIMARY KEY,
  ownerUserId TEXT,
  data TEXT            -- JSON blob: {id, goal, dailyPlans[], ...}
)

documents (
  id TEXT PRIMARY KEY,
  ownerUserId TEXT,
  data TEXT            -- JSON blob: {id, name, path}
)

activity_logs (
  id TEXT PRIMARY KEY,
  userId TEXT,
  action TEXT,
  timestamp TEXT,
  duration_sec INTEGER
)

google_tokens (
  userId TEXT PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  token_uri TEXT,
  client_id TEXT,
  client_secret TEXT,
  scopes TEXT,         -- JSON array
  expiry TEXT
)
```

---

## Environment Variables

```env
# Required
GROQ_API_KEY=gsk_...

# Google OAuth
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/oauth/callback
GOOGLE_LOGIN_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# OAuth over HTTP (localhost only — remove in production)
OAUTHLIB_INSECURE_TRANSPORT=1
OAUTHLIB_RELAX_TOKEN_SCOPE=1

# Optional
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

`credentials.json` must be placed at the **workspace root** (not inside `Backend/`). It must be a Google OAuth 2.0 Desktop app credential file.

---

## Setup & Run

```bash
# From workspace root
uv sync

cd Backend
../.venv/Scripts/python.exe -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload
```

On first run, `init_db()` creates all tables and seeds a default `super_admin` account if the users table is empty.

Interactive API docs: `http://localhost:5000/docs`

---

## Agent System

### Chains (`agent_chain.py`)

| Chain | Model | Tools | Use case |
|---|---|---|---|
| `chat_chain` | llama-3.1-8b-instant | DuckDuckGo, Wikipedia, `admin_db_query`, `system_explorer` | General conversation |
| `code_chain` | llama-3.1-8b-instant | DuckDuckGo, Wikipedia | Code generation |
| `writer_chain` | llama-3.1-8b-instant | — | Content writing |
| `final_chain` | llama-3.1-8b-instant | — | Auto-routes to above |

The `admin_db_query` tool is role-gated — it only executes for `admin` / `super_admin` users.

### Scheduler (`scheduler.py`)

1. `extract_context(query)` — LLM extracts goal, duration, start date, gap days; uses DuckDuckGo to find topic subtopics
2. `generate_schedule(context)` — LLM generates a day-by-day plan with time blocks
3. `create_calendar_events(schedule, context, user_id)` — Creates events in the user's own Google Calendar using their stored tokens

### Document RAG (`doc.py`)

1. PDF loaded with `PyPDFLoader`
2. Split into 1000-char chunks with 200-char overlap
3. Embedded with `all-MiniLM-L6-v2` and stored in a per-user Chroma directory
4. Top-2 similar chunks retrieved and passed to LLM with the user's question

---

## Deployment Notes

- Set `OAUTHLIB_INSECURE_TRANSPORT=0` (or remove it) in production — HTTPS is required
- Replace SQLite with PostgreSQL for multi-process deployments
- Store `credentials.json` and `.env` as secrets (never commit them)
- The `UploadedFiles/` and `vector_store/` directories need persistent storage in containerized deployments
- Run behind a reverse proxy (nginx/caddy) with TLS termination
