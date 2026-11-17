# Vendor360 REST API Reference

The backend exposes RESTful endpoints under `/api` with automatic OpenAPI interactive documentation available at `/docs` (when `ENABLE_DOCS=true`).

---

## 🔐 Authentication (`/api/auth`)
- `POST /api/auth/signup`: Register a new store owner account.
- `POST /api/auth/login`: Identifier and password login (returns short-lived `challenge_token`).
- `POST /api/auth/verify-otp`: Step-up challenge token verification (mints HS256 JWT session token).
- `POST /api/auth/resend-otp`: Request fresh 6-digit challenge code using the challenge token.
- `POST /api/auth/forgot-password`: Rate-limited password reset link issuance.
- `POST /api/auth/reset-password`: Single-use token-based password reset (increments `token_epoch`).
- `POST /api/auth/change-password`: Authenticated password change (invalidates older sessions).
- `POST /api/auth/logout-all`: Increments `token_epoch` to revoke all active sessions for the vendor.
- `GET /api/auth/security-log`: Paginated security audit log of sign-ins, failures, lockouts, and resets.

---

## 🏪 Vendor Profile (`/api/vendor`)
- `GET /api/vendor/me`: Current vendor profile, UPI VPA, GSTIN, and language preferences.
- `PUT /api/vendor/me`: Update store name, owner name, phone, UPI ID (`upi_id`), GSTIN (`gstin`), and language preference.

---

## 📦 Inventory & Catalogue (`/api/inventory`)
- `GET /api/inventory`: Filterable product catalogue with search and barcode lookup.
- `POST /api/inventory`: Create new SKU catalogue item and opening stock batch.
- `GET /api/inventory/expiring-soon`: Retrieve items/batches approaching expiry with suggested clearance pricing.
- `GET /api/inventory/barcode/{barcode}`: Multi-layer barcode resolver (GS1 check digit, local catalogue, cached Open Food Facts lookup).
- `GET /api/inventory/{id}/batches`: Active FIFO stock lots (`StockBatch`) for a product.
- `PUT /api/inventory/{id}`: Update catalogue metadata with optimistic concurrency (`expected_last_updated`).
- `DELETE /api/inventory/{id}`: Archive an inventory item while preserving historical sale records.
- `POST /api/inventory/{id}/adjust`: Adjust stock levels with recorded audit rationale.
- `POST /api/inventory/voice-log`: Interpret or commit multilingual voice transcript stock movements.

---

## 🧾 Billing & Sales (`/api/sales`)
- `POST /api/sales`: Finalize customer invoice with FIFO lot depletion (supports client-minted `offline_id` for idempotency).
- `POST /api/sales/sync-batch`: Synchronize queued offline sales (up to 500 per batch) with per-item idempotency and error reporting.
- `GET /api/sales`: Recent sales history with line items and profit calculation.
- `GET /api/sales/day-close`: Shop-timezone (`SHOP_TZ`) day summary of sales, margins, top items, and payment breakdown.
- `POST /api/sales/{id}/void`: Void a sale, restore exact consumed inventory batches, and record compensating Khata ledger reversals.

---

## 📒 Digital Khata Ledger (`/api`)
- `GET /api/customers`: List customers with outstanding credit/advance ledger balances.
- `POST /api/customers`: Create a new khata customer.
- `GET /api/customers/{id}/history`: Customer ledger statement and transaction history.
- `POST /api/khata/transaction`: Record credit (`credit`) or payment recovery (`payment`) entries.
- `DELETE /api/customers/{id}`: Delete a settled customer (blocked if balance is non-zero or customer has sales/tx history).

---

## 📊 Analytics & Forecasting (`/api/analytics`)
- `GET /api/analytics/sales-trend`: Daily revenue, profit, and order count over the requested window.
- `GET /api/analytics/health-score`: Composite store health score (0–100) from margin, stock health, khata recovery, and consistency.
- `GET /api/analytics/forecast`: Day-of-week weighted demand forecast from real sales history.
- `GET /api/analytics/reorder-list`: Items at or below `reorder_point` with suggested order quantities.
- `GET /api/analytics/heatmap`: Catchment demand zones, wholesalers, and competitor markers around coordinates.

---

## 🔊 UPI Payments & Soundbox (`/api/checkout`)
- `POST /api/checkout/generate-upi-qr`: Generate static/amount UPI QR image for the vendor's configured VPA.
- `POST /api/checkout/create-intent`: Mint dynamic UPI QR payment intent with unique `txn_ref`.
- `GET /api/checkout/intent/{txn_ref}/status`: Poll payment completion status and UTR.
- `GET /api/checkout/stream`: Server-Sent Events (SSE) stream for real-time `payment_completed` soundbox pushes.
- `POST /api/checkout/webhook`: HMAC-SHA256 authenticated UPI aggregator webhook for automatic reconciliation.
- `POST /api/checkout/simulate-payment`: Demo-mode simulator to trigger payment completion (available only when `DEMO_MODE=true`).
- `GET /api/checkout/recent-payments`: List recent completed UPI transactions for counter reconciliation.

---

## 🚚 Goods Intake & Purchase Register (`/api/intake`)
- `GET /api/intake/current`: Resume open stock intake session if one exists.
- `POST /api/intake/start`: Initialize a new delivery intake session.
- `GET /api/intake`: List closed/open delivery intake sessions with totals.
- `GET /api/intake/register`: Monthly GST purchase register (`?month=YYYY-MM`) with CGST/SGST/IGST breakdown.
- `GET /api/intake/{id}`: Full goods-received note (GRN) and GST summary for a session.
- `PUT /api/intake/{id}`: Update supplier name, supplier GSTIN, invoice number, and invoice date.
- `POST /api/intake/{id}/scan`: Scan incoming loose or carton barcode.
- `POST /api/intake/{id}/confirm`: Confirm carton/new-product intake line and ingest stock lot.
- `DELETE /api/intake/{id}/lines/{line_id}`: Undo a scanned intake line (blocked if stock from that lot has already been sold).
- `POST /api/intake/{id}/close`: Finalize delivery intake session.
- `POST /api/intake/{id}/reopen`: Reopen a closed intake session for corrections.

---

## 🧪 Demo & Health (`/api/demo`, `/api/health`)
- `GET /api/demo/status`: Reports whether `DEMO_MODE` is enabled.
- `POST /api/demo/seed`: Seeds sample Kirana catalogue, Khata customers, and 30 days of sales history (requires `DEMO_MODE=true` and `confirm_wipe=true`).
- `GET /api/health`: Health check endpoint (`{"status": "ok"}`).
