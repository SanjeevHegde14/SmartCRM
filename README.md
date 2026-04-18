# Smart CRM and Lead Management Platform

## Project Description

Manage client leads and sales follow-up process.

## What to Build

- Lead tracking dashboard
- Client communication logs
- Follow-up reminders

## Current Stack (Implemented)

- Backend: Django + SQLite with optional Firebase sync
- Frontend: React + Vite
- AI: rule-based CRM insights with optional local Ollama chat

## Project Structure

- frontend: React app (landing page, login page, CRM workspace UI)
- backend: Django API (auth, leads, reminders, notes, dashboard metrics, AI endpoints)

## Prerequisites

- Python 3.10+
- Node.js 20+

## Run Locally

1. Backend setup:
- `cd backend`
- `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`
- `.\.venv\Scripts\python.exe manage.py migrate`
- `.\.venv\Scripts\python.exe manage.py runserver`

2. Frontend setup:
- `cd frontend`
- `npm install`
- `npm.cmd run dev`

3. API URL (optional):
- frontend uses `VITE_API_URL`
- default value: `http://127.0.0.1:8000/api`

4. Optional Firebase env vars:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CREDENTIALS_PATH`
- `FIREBASE_STORAGE_BUCKET`

5. Optional Ollama env vars:
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_TIMEOUT_SECONDS`
- `OLLAMA_FALLBACK_MODELS`

## Quick Start (Copy/Paste)

Backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

Frontend:

```powershell
cd frontend
npm install
npm.cmd run dev
```

Production build:

```powershell
cd frontend
npm.cmd run build
```

## How To Use The App

1. Start the backend and frontend using the commands above.
2. Open the frontend URL shown by Vite, usually `http://127.0.0.1:5173`.
3. Click `Log In` from the landing page.
4. If you do not have an account yet, switch to `Signup` and create one.
5. After login, you will enter the CRM workspace.

### Main Features

- Create Lead: add company, contact, source, stage, value, assignee, last touch, and notes
- Pipeline View: see stage totals and the leads table
- Stage Updates: move a lead from `new` to `qualified`, `proposal`, `negotiation`, `won`, or `lost`
- Reports: view conversion rate, won count, average deal size, forecast gap, and source analytics
- Reminders: create follow-up tasks for a selected lead and mark them done/pending
- Communication Logs: save email, call, meeting, or chat notes for a selected lead
- Ask AI: ask CRM questions and get rule-based or local Ollama-powered responses

### Suggested First Test Flow

1. Sign up
2. Create a lead
3. Change its stage
4. Add one communication log
5. Add one reminder
6. Open `Reports`
7. Open `Ask AI` and ask: `What is my total pipeline value?`

## Troubleshooting

- If `python` is not recognized in PowerShell, use the project interpreter directly:
  `.\backend\.venv\Scripts\python.exe .\backend\manage.py runserver`
- If `npm` is blocked in PowerShell, use `npm.cmd` instead of `npm`
- If port `8000` or `5173` is already in use, stop old dev servers or run on a different port
- If AI chat returns limited fallback answers, Ollama is likely not running locally
- If there are no leads yet, the backend may seed demo leads on the first authenticated lead fetch

## API Endpoints

- POST /api/auth/login/
- POST /api/auth/signup/
- POST /api/auth/logout/
- GET /api/auth/session/
- GET /api/dashboard/
- GET /api/ai/insights/
- POST /api/ai/chat/
- GET /api/leads/
- POST /api/leads/
- PATCH /api/leads/<lead_id>/
- POST /api/leads/<lead_id>/notes/
- GET /api/leads/<lead_id>/notes/list/
- GET /api/leads/<lead_id>/reminders/
- POST /api/leads/<lead_id>/reminders/
- PATCH /api/reminders/<reminder_id>/

## How to Handle Leads Data

Use two interfaces instead of one overloaded screen:

1. Lead Intake Interface
- Purpose: capture clean lead input quickly
- Fields: company, contact, source, owner, estimated value, notes
- Used by: marketing ops, SDRs, admin

2. Sales Workspace Interface
- Purpose: manage lead progression and follow-up
- Includes: pipeline cards, lead table, reminders, activity timeline
- Used by: account execs, sales managers

Recommended flow:
- new lead enters through intake form
- lead appears in workspace as stage=new
- sales team updates stage over time (qualified -> proposal -> negotiation -> won/lost)

## Expected Output

- Lead pipeline
- Conversion reports
- Reminder management
- Communication timeline
- AI-assisted CRM workflow
