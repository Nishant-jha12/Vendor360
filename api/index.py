"""Vercel Serverless entrypoint for the Vendor360 FastAPI backend."""
import os
import sys
from pathlib import Path

BACKEND_DIR = str(Path(__file__).resolve().parent.parent / "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Vercel's deployment filesystem is read-only outside /tmp. If no external
# DATABASE_URL (e.g., Neon/Supabase Postgres) is configured, fall back to
# writable /tmp/vendor360.db so preview deployments boot without crashing.
if os.environ.get("VERCEL") and not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:////tmp/vendor360.db"

# On non-production Vercel previews without an external SMS gateway, enable
# development demo shortcuts unless explicitly overridden in Vercel settings.
if os.environ.get("VERCEL") and os.environ.get("APP_ENV", "development").lower() != "production":
    os.environ.setdefault("DEBUG_OTP", "true")
    os.environ.setdefault("DEMO_MODE", "true")

from main import app  # noqa: E402, F401
