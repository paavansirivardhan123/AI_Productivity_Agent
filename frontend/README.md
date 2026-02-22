# AI Productivity Agent – Frontend

Modern Next.js 14 frontend for the AI Productivity Agent SaaS platform.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Radix UI** primitives
- **Zustand** (state management)
- **Framer Motion** (animations)

## Structure

```
src/
├── app/                    # App Router pages
│   ├── (auth)/             # Auth route group
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── dashboard/          # User dashboard
│   │   ├── chat/
│   │   ├── scheduler/
│   │   ├── documents/
│   │   ├── settings/
│   │   └── upgrade/
│   └── admin/              # Admin panel
│       ├── users/
│       └── analytics-chat/
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── layout/             # Dashboard & Navbar
│   └── chat/               # Chat workspace
├── lib/                    # Utils, API client
├── store/                  # Zustand stores
└── types/                  # TypeScript types
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Mode

Without `NEXT_PUBLIC_API_URL`, the app runs in demo mode:
- Login/register accept any credentials
- Add "admin" to email (e.g. `admin@test.com`) to access admin panel

## Build

```bash
npm run build
npm start
```
