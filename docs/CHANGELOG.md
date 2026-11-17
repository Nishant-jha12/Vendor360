# Changelog - Vendor360

## [2.0.0] - 2026-11-17

### Added
- **True Offline-First Architecture & Background Sync**:
  - Tenant-scoped `IndexedDB v2` (`vendor360_offline_db`) caching products, khata customers, and offline sales outbox.
  - Client-minted `offline_id` idempotency with compound unique constraint `(vendor_id, offline_id)` on the backend.
  - Bulk offline synchronization (`POST /api/sales/sync-batch`) with automatic client-side 500-item chunking and per-item failure reporting in the Sync Center modal (`SyncCenterModal.jsx`).
  - Service Worker shell caching (`sw.js` / `vendor360-shell-v2`) and global `ErrorBoundary`.
- **Software UPI Soundbox & Auto-Reconciliation Engine**:
  - Dynamic UPI QR payment intents (`POST /api/checkout/create-intent`), status polling, and recent payments log.
  - HMAC-SHA256 authenticated bank webhook (`POST /api/checkout/webhook`) with constant-time signature verification and UTR capture.
  - Real-time Server-Sent Events stream (`GET /api/checkout/stream`) pushing `payment_completed` events to the active counter.
  - Built-in Web Audio API dual-tone chime synthesizer and Web Speech API voice announcements in Hindi (`hi-IN`), Marathi (`mr-IN`), Bengali (`bn-IN`), and English (`en-IN`).
  - One-tap payment simulator (`POST /api/checkout/simulate-payment`, gated by `DEMO_MODE`).
- **Mobile-First App Redesign**: Native mobile frame, 4-tab bottom navigation, and Kirana App Drawer.
- **Light and Dark Theme**: Segmented Home screen toggle, top bar quick toggle, login screen toggle, and settings selector.
- **4 Vernacular Languages**: 100% complete English (`en`), Hindi (`hi`), Marathi (`mr`), and Bengali (`bn`) coverage across all 348 UI keys.
- **PWA Ready**: Web App Manifest, Service Worker, and mobile viewport meta configuration.

### Enhanced
- **Security & Correctness Audit Remediation**:
  - Upgraded PBKDF2-HMAC-SHA256 password hashing to 600,000 iterations with transparent legacy hash upgrade.
  - Normalized Indic numerals (Devanagari, Bengali, Marathi) and guarded non-ASCII comparisons in OTP verification.
  - Sanitized non-finite floats (`NaN`, `Infinity`, `-Infinity`) in FastAPI validation handlers to return `422 Unprocessable Entity` instead of `500`.
  - Added optimistic concurrency (`expected_last_updated`) on inventory edits, archived-customer guards on Khata sales, and voided-sale guards on customer deletion.
  - Added shop timezone (`SHOP_TZ=Asia/Kolkata`) business-day boundary calculation across analytics and day-close summaries.
- **Hands-Free Voice Inventory**: Enhanced vernacular matching (Devanagari/Bengali numerals, colloquial Hindi/Marathi/Bengali/Hinglish keywords, and word-order-aware directional intent).
- **Quick Billing**: Faster barcode scanner integration (`BarcodeDetector` + self-hosted ZXing WASM) with FIFO batch lot depletion.
- **Digital Khata**: One-click WhatsApp payment reminders with custom vernacular messages.
