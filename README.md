# Events Dashboard

This repository contains two parts:

- A deployable ingestion API in `api/` for receiving events with API-key auth.
- A local Vite dashboard in `src/` that reads from Supabase and updates in real time.

## Stack

- Frontend: React 19 + TypeScript + Vite
- Backend: Vercel-style edge functions in `api/`
- Database and realtime: Supabase

## Setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill in the values.
4. Install dependencies with `npm install`.
5. Start the local dashboard with `npm run dev`.

## Deploying the API

Deploy the repository to a serverless host that supports the `api/` directory layout. Vercel is the simplest target for this codebase.

Set these server-side environment variables on the remote deployment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PROJECT_ADMIN_TOKEN`
- `APP_URL`

The dashboard only needs the public Vite variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_DEFAULT_PROJECT_SLUG`
- `VITE_API_BASE_URL`

## Creating a Project

You can create a project from the dashboard by entering the API base URL and admin token, or by calling the remote endpoint directly:

```bash
curl -X POST https://your-api.example.com/api/projects \
  -H "content-type: application/json" \
  -H "x-admin-token: $PROJECT_ADMIN_TOKEN" \
  -d '{"name":"Orders service","slug":"orders-service"}'
```

The response includes a generated API key. Store it once.

## Sending Events

```bash
curl -X POST https://your-api.example.com/api/events \
  -H "content-type: application/json" \
  -H "x-api-key: evt_your_generated_key" \
  -d '{
    "channel": "orders",
    "title": "Order paid",
    "description": "Order #1042 completed checkout",
    "icon": "🧾",
    "tags": ["checkout", "production"]
  }'
```

## Validation

- `npm run build`
- `npm run lint`
