# Vendor360

Billing, inventory, dynamic UPI QR & Soundbox, and digital khata for neighbourhood retail shops — packaged as a **standalone frontend demo** backed by persistent browser storage (`localStorage` + `IndexedDB`), with zero backend server required.

---

## Quick Demo Login

- **Username:** `testowner` (or click **Use Demo Store (testowner)** on the Sign In screen)
- **Password:** `Test@123456`
- **OTP Code:** `123456`

Pre-loaded with 12 Kirana SKUs (including multi-batch FEFO lots), 4 Khata customers, 30 days of realistic sales history, 2 wholesale deliveries with GST breakup, expiry alerts, and sample demand heatmap zones.

You can also create a fresh account via **Create an account**, edit any product/customer/sale, simulate 1-tap UPI Soundbox payments with real QR codes, or reset sample data anytime from **Account -> Load sample data**.

---

## Running Locally

You need Node 20.19+ or Node 22+.

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. On Windows, you can also run `./run.ps1`.

---

## Verification Commands

```bash
npm --prefix frontend run i18n:check
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

---

## Deploying to Vercel

This repository is frontend-only (`frontend/`):

- **Root Directory = `.` (repo root):** handled automatically by root `vercel.json` (`installCommand`, `buildCommand`, `outputDirectory: frontend/dist`).
- **Root Directory = `frontend`:** uses Vite defaults and `frontend/vercel.json` SPA rewrites.

No Python runtime or environment variables are needed.
