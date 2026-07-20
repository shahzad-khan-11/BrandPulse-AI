# Security Audit & Policies Checklist 🛡️

This audit checklist reviews the security mechanisms protecting the BrandPulse AI ecosystem.

---

## 1. Network & Protocol Controls

### 1.1 Secure HTTP Headers
- `helmet()` middleware configures XSS and clickjacking protections.
- CORS policies match allowed origin hosts (`process.env.FRONTEND_URL`), blocking unauthorized cross-domain scripting.

### 1.2 Rate Limiting
- Locked to **100 requests per 15 minutes per IP** globally on `/api` routes.

---

## 2. Authentication & Data Security

### 2.1 Password Security & JWT
- Hashed using `bcryptjs` with 10 salt rounds.
- Short-lived stateless JWT tokens (`15m`) with refresh token rotation prevent access hijackings.

### 2.2 Upload Filtering
- Restricts document uploads strictly to standard images (JPEG, PNG, WEBP) and files (PDF, DOCX, CSV, XLSX).
- File size is capped at **5MB** to prevent denial-of-service (DoS) attacks.

### 2.3 n8n HMAC Verification
- Outbound payloads are signed using **HMAC-SHA256** and sent with the `X-BrandPulse-Signature` header for verification.

### 2.4 Zod Schema Validations
- Sanitizes request payloads and strips unrecognized parameters to prevent database injections.
- Schema properties configure `select: false` on Mongoose fields (e.g. passwords and API key hashes) to prevent exposing sensitive data.
