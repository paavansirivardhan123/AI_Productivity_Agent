# Frontend — ProdAgent

Next.js 14 frontend for the ProdAgent platform. Built with the App Router, TypeScript, Tailwind CSS, and Zustand for state management.

---

## UI/UX Overview

The interface is split into three areas:

- **Auth pages** (`/login`, `/register`) — minimal card-based layout with email/password and Google sign-in
- **Dashboard** (`/dashboard/*`) — sidebar navigation with Chat, Scheduler, Documents, Settings, and Upgrade pages
- **Admin panel** (`/admin/*`) — separate layout with user management, analytics chat, and activity logs

Design system is built on shadcn/ui components (Radix UI primitives + Tailwind). Animations use Framer Motion sparingly for transitions.

---

## Tech Stack

| Category | Library |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3, shadcn/ui |
| State | Zustand 4 (with `persist` middleware) |
| UI Primitives | Radix UI (dialog, tabs, switch, dropdown, etc.) |
| Icons | Lucide React |
| Charts | Recharts |
| Animations | Framer Motion |
| Date utils | date-fns |
| Markdown | react-markdown |
| HTTP | Native `fetch` (custom wrapper) |

---

## Folder Structure

```
frontend/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx         # Login — email/password + Google
│   │   ├── register/page.tsx      # Registration form
│   │   └── forgot-password/       # Password reset placeholder
│   ├── dashboard/
│   │   ├── layout.tsx             # Auth guard + session validation + chat loader
│   │   ├── page.tsx               # Dashboard home / overview
│   │   ├── chat/page.tsx          # Multi-agent chat interface
│   │   ├── scheduler/page.tsx     # AI schedule generator + calendar sync
│   │   ├── documents/page.tsx     # PDF upload + RAG Q&A
│   │   ├── settings/page.tsx      # Profile, subscription, integrations
│   │   └── upgrade/page.tsx       # Premium upgrade page
│   └── admin/
│       ├── layout.tsx             # Admin auth guard + sidebar
│       ├── page.tsx               # Stats dashboard
│       ├── users/page.tsx         # User management table + edit modal
│       ├── analytics-chat/page.tsx # AI chat with DB access
│       └── activity/page.tsx      # Activity log viewer
├── components/
│   ├── chat/
│   │   ├── ChatWorkspace.tsx      # Full chat UI — sessions, messages, input
│   │   ├── ChatMessage.tsx        # Individual message bubble (markdown support)
│   │   └── FileUploadButton.tsx   # File picker for chat attachments
│   ├── layout/
│   │   ├── DashboardLayout.tsx    # Sidebar + main content shell
│   │   └── DashboardNavbar.tsx    # Top bar with user menu
│   └── ui/                        # shadcn/ui components (button, card, input, etc.)
├── store/
│   ├── auth-store.ts              # User + token state (persisted)
│   └── chat-store.ts              # Chat sessions + messages (persisted)
├── lib/
│   ├── api.ts                     # fetch wrapper with auth headers + error handling
│   ├── api-services.ts            # Typed API functions for every endpoint
│   ├── validation.ts              # Form validators (email, password, name)
│   └── utils.ts                   # cn() utility (clsx + tailwind-merge)
├── hooks/
│   └── useSessionExpiry.ts        # Polls /auth/me every 60s to detect role changes
└── types/
    └── index.ts                   # Shared TypeScript interfaces
```

---

## Key Components

### `ChatWorkspace.tsx`
The core chat UI. Manages session selection, message rendering, agent selection (chat/code/writer/scheduler/auto), file attachment, and streaming-style message display. Syncs with the backend on every send and persists sessions in Zustand.

### `dashboard/layout.tsx`
The auth boundary for all dashboard pages. On mount it:
1. Checks for `?google_token=xxx` in the URL (post-Google-login redirect) and bootstraps the session
2. Falls back to the persisted token from Zustand
3. Validates the token against `/api/auth/me`
4. Loads all chat sessions into the chat store
5. Redirects to `/login` if validation fails

### `scheduler/page.tsx`
Handles the full schedule lifecycle: form input → API call → plan display (list/timeline/calendar tabs) → Google Calendar sync. Detects `?calendar=connected` on return from OAuth to update UI state.

### `settings/page.tsx`
Inline `GoogleCalendarConnect` component handles calendar connection status, connect/disconnect flow, and premium gating — all without leaving the settings page.

### `admin/users/page.tsx`
Data table with search, filter by subscription/role, inline edit modal (role changes restricted to `super_admin`), and delete confirmation.

---

## State Management

Two Zustand stores, both persisted to `localStorage`:

### `auth-store.ts`

```ts
{
  user: User | null       // id, name, email, role, subscriptionType
  token: string | null    // Bearer token
  setAuth(user, token)    // Store auth state + write to localStorage
  logout()                // Clear all storage + redirect to /login
  isAdmin()               // role === "admin" | "super_admin"
  isPremium()             // subscriptionType === "premium"
}
```

### `chat-store.ts`

Stores all chat sessions and their messages. Provides `addSession`, `addMessage`, `updateMessage`, `deleteMessage`, `resetState`.

---

## API Integration

All API calls go through two functions in `lib/api.ts`:

```ts
api<T>(endpoint, options?)      // JSON requests — auto-attaches Bearer token
apiUpload<T>(endpoint, formData) // Multipart — for file uploads and AI chat
```

Both handle:
- `401` → clear token + redirect to `/login?expired=1`
- Network failure → throw `NetworkError` with a user-friendly message
- Non-OK responses → throw with `detail` or `message` from response body

All typed API functions live in `lib/api-services.ts` — import from there, not directly from `api.ts`.

---

## Form Validation

`lib/validation.ts` exports a `validators` object:

```ts
validators.email(v)      // Requires valid TLD, no spaces
validators.password(v)   // Min 6 chars
validators.name(v)       // Min 2 chars, non-empty
validators.required(v)   // Non-empty check
```

All return `string | null` — `null` means valid. Used inline in login and register forms with per-field error display.

---

## Setup & Run

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

```bash
npm run dev       # Development server at http://localhost:3000
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # ESLint
```

---

## Build & Deployment

```bash
npm run build
npm run start
```

For production deployment (Vercel, Docker, etc.):

- Set `NEXT_PUBLIC_API_URL` to your production backend URL
- Ensure the backend has the correct `ALLOWED_ORIGINS` set
- Google OAuth redirect URIs in Google Cloud Console must match the production domain

**Docker example:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Performance Notes

- `loadedRef` in dashboard layout prevents double-fetching on React strict mode re-renders
- Chat sessions are loaded once on dashboard mount and kept in Zustand — no per-page refetch
- Chroma vector stores are built once per document and reused on subsequent queries
- `useSessionExpiry` hook polls every 60 seconds (not on every render) to detect server-side role/subscription changes
