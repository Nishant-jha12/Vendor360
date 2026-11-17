# Vendor360 Security Architecture

## 🛡 Authentication & Secrets
- **Two-Step Chained Login**: Password verification issues a short-lived `otp_challenge` JWT; only after OTP verification is an `access` JWT minted.
- **Password Hashing**: PBKDF2-HMAC-SHA256 with **600,000 iterations** and per-user 16-byte random cryptographic salts, plus automatic upgrade of legacy hashes.
- **Session Tokens & Revocation**: HS256 JWT with strict purpose claims (`access`, `otp_challenge`, `password_reset`) and per-vendor `token_epoch` for instant global session revocation (`/api/auth/logout-all`).
- **Rate Limiting & Persistent Lockout**: Per-IP and per-account rate limiting on login, signup, OTP, and password reset, backed by database-persisted `failed_logins` and `locked_until` counters that survive server restarts.
- **Webhook Authenticity**: HMAC-SHA256 signature verification (`X-Webhook-Signature`) with `hmac.compare_digest` for UPI payment webhooks.
- **Production Safety Gate**: `validate_for_production()` refuses startup when `APP_ENV=production` if `SECRET_KEY` is weak/ephemeral, `WEBHOOK_SIGNING_SECRET` is missing, `DEBUG_OTP` or `DEMO_MODE` is enabled, `ENABLE_DOCS` is on, `RATE_LIMIT_ENABLED` is off, or `CORS_ORIGINS` contains wildcards/HTTP origins.
- **Audit Log**: Persistent `SecurityEvent` log of logins, failures, lockouts, password changes, and resets (`/api/auth/security-log`) with automatic retention pruning.
