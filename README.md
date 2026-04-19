# Smart CRM and Lead Management Platform

## Project Description

Manage client leads and sales follow-up process.

## What to Build

- Lead tracking dashboard
- Client communication logs
- Follow-up reminders

## Backend

- Django / Firebase

## Current Stack (Implemented)

- Backend: Django
- Frontend: React + Vite
- Database: Firebase Firestore for app data
- LLM: Hosted Hugging Face endpoint with fallback to local Ollama

## Project Structure

- frontend: React app (landing page, login page, CRM workspace UI)
- backend: Django API (auth, leads, dashboard metrics)

## Prerequisites

- Python 3.10+
- Node.js 20+ (nvm recommended)

## Run Locally

### 1. Backend
- `cd backend`
- `python3 -m pip install --user -r requirements.txt`
- `cp .env.example .env`
- Fill in the Firebase values in `.env`
- Put your Firebase service account JSON at `backend/firebase-key.json`
- `python manage.py migrate`
- `python manage.py runserver`

### 2. Frontend
- `cd frontend`
- `nvm use 20`
- `npm install`
- `cp .env.example .env`
- Fill in the same Firebase web app config values used by the project
- `npm run dev`

### 3. Firebase connection for anyone cloning the repo
To connect to the same database, a new developer needs:

- The same Firebase project ID: `smartcrm-dd52b`
- The same web app config values from Firebase Console
- The Firebase service account JSON for the backend
- Firestore rules already published in the Firebase project
- The repo `.env` values copied from `.env.example`

If they use different Firebase values, they will connect to a different database.

### 4. Minimal Firebase handover steps
If you are handing this project to someone else, tell them to do this:

1. Accept the Firebase project invite with their Google account.
2. Copy `backend/.env.example` to `backend/.env` and set `FIREBASE_PROJECT_ID=smartcrm-dd52b`.
3. Put a valid service account JSON file at `backend/firebase-key.json`.
4. Copy `frontend/.env.example` to `frontend/.env` and fill the Firebase web app config from Firebase Console.
5. Run `cd backend && python manage.py migrate` and `python manage.py runserver`.
6. Run `cd frontend && nvm use 20 && npm install && npm run dev`.
7. Open the web app and verify that a new lead appears in Firestore.

For Android later, they only need the same Firebase project plus `google-services.json` from Firebase Console.

## Troubleshooting

- If frontend fails with Node errors, run `nvm use 20` inside `frontend`.
- If port 8000 or 5173 is already in use, stop old dev servers or run with a different port.
- If Firebase reads fail, confirm the backend `.env` points to `smartcrm-dd52b` and the service account JSON is present.
- If the web app connects to the wrong database, check the frontend `.env` Firebase values.

## API Endpoints

- POST /api/auth/login/
- POST /api/auth/logout/
- GET /api/auth/session/
- GET /api/dashboard/
- GET /api/leads/
- POST /api/leads/
- PATCH /api/leads/<lead_id>/
- POST /api/leads/<lead_id>/notes/

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
