# Health Screening Assistant — Next.js Frontend

Converted from the Google Stitch design export, wired to the FastAPI backend.

## Setup
1. `npm install`
2. `cp .env.local.example .env.local` (adjust the URL if your backend runs elsewhere)
3. `npm run dev`
4. Make sure `backend.py` is running on port 8000 (see the backend project's README)

## Pages
- `/` — Home
- `/symptom-checker` — AI Symptom Checker (real ML model + AI explanation)
- `/report-analysis` — X-ray / MRI upload and classification
- `/doctors` — Find a Doctor (add/remove doctors, call, book)
- `/appointments` — Book appointments, manage medicine reminders
- `/emergency` — Emergency contacts (add/remove) + public emergency numbers
- `/profile` — Editable personal info + account overview
