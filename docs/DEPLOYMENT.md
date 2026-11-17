# Vendor360 Deployment Guide

## ▲ Vercel Full-Stack Deployment (Recommended)

The repository includes root [`vercel.json`](../vercel.json), [`api/index.py`](../api/index.py), and [`requirements.txt`](../requirements.txt) so both the React 19 Vite frontend and the FastAPI backend deploy together on one Vercel domain:

1. Import the GitHub repository in **Vercel → Add New Project**.
2. Leave **Root Directory** at `./` (`vercel.json` builds `frontend/dist` and routes `/api/*` to `api/index.py`).
3. Set **Environment Variables** in Vercel Project Settings:
   - `SECRET_KEY`: a 48+ character random string (`python -c "import secrets; print(secrets.token_urlsafe(48))"`).
   - `DATABASE_URL` *(recommended for persistent storage)*: PostgreSQL connection string (e.g., Neon / Supabase / Vercel Postgres: `postgresql+psycopg://user:pass@host/db?sslmode=require`). Without it, preview deployments automatically use `/tmp/vendor360.db` (ephemeral SQLite).
   - Optional for strict production mode (`APP_ENV=production`): `WEBHOOK_SIGNING_SECRET`, `NOTIFY_PROVIDER=http`, `NOTIFY_HTTP_URL`, `CORS_ORIGINS=https://your-app.vercel.app`, `PASSWORD_RESET_URL=https://your-app.vercel.app/auth`, `DEBUG_OTP=false`, `DEMO_MODE=false`, `ENABLE_DOCS=false`.
4. Click **Deploy**.

## 🐳 Docker Deployment
```bash
docker compose up -d --build
```

## 🌐 Production Recommendations
- Terminate SSL with NGINX, Caddy, or Vercel Edge TLS.
- Set a strong `SECRET_KEY` and `WEBHOOK_SIGNING_SECRET`.
- Use PostgreSQL (`DATABASE_URL=postgresql+psycopg://...`) for persistent multi-instance concurrency.
