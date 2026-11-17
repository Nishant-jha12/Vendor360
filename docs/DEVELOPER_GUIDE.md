# Vendor360 Developer Guide

## 🛠 Local Setup
```bash
# Python Backend (http://127.0.0.1:8000)
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python migrate.py
uvicorn main:app --reload --port 8000

# React Frontend (http://127.0.0.1:5173)
cd frontend
npm install
npm run dev
```

On Windows, running `.\run.ps1` from the repository root starts both services automatically.

## 🧪 Running Tests & Verification
```bash
# Backend pytest suite (145 tests)
python -m pytest backend/

# Frontend localization parity check (348 keys across en, hi, mr, bn)
npm --prefix frontend run i18n:check

# Frontend unit tests
npm --prefix frontend test

# Frontend static analysis (oxlint)
npm --prefix frontend run lint

# Full pre-push verification (i18n + unit tests + lint + production build)
node scripts/verify-locales.mjs
node scripts/verify-build.mjs
```
