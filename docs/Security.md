# Backend Security Architecture 🛡️

This document details the security policies, middlewares, and configurations protecting the BrandPulse AI backend.

---

## 1. Network & Threat Protection

### 1.1 HTTP Security Headers (Helmet.js)
We use `helmet()` middleware to configure HTTP response headers (e.g. Content-Security-Policy, X-Frame-Options, X-Content-Type-Options) to mitigate common attack vectors (like Clickjacking and MIME sniffing).
- `crossOriginResourcePolicy` is disabled specifically to allow Vite to load static report assets securely from the `/uploads` directory.

### 1.2 CORS Policy
Cross-Origin Resource Sharing (CORS) is locked down using a whitelist origin matching `process.env.FRONTEND_URL` (defaulting to `http://localhost:5173`). Methods are limited to `GET`, `POST`, `PUT`, `DELETE`.

### 1.3 Rate Limiting
- `express-rate-limit` is configured as a global middleware on `/api` routes.
- Limit: **100 requests per 15 minutes per IP**.
- Returns a structured error payload on threshold exceedance.

---

## 2. Code & Data Security

### 2.1 File Upload Sanitation (Multer)
To prevent malicious code injection (such as executable scripts uploaded as images), the upload system enforces strict limits:
- **Size Limit**: Maximum of **5MB**.
- **Mimetype Whitelist**: Restricts uploads strictly to standard images (JPEG, PNG, WEBP) and business documents (PDF, DOCX, CSV, XLSX).

### 2.2 Zod Schema Validations
All incoming route parameters (`req.body`, `req.query`, `req.params`) are validated against Zod schemas before hitting the controllers. This provides:
- Clean type casting.
- Strict property validation (strips unrecognized keys).
- Clear client feedback for invalid structures.

### 2.3 Secrets Management
- Sensitive fields like user `password` and `hashedKey` (APIKey collection) have `select: false` configured on Mongoose schemas.
- Credentials and JWT signatures are stored in `.env` and excluded from source control via `.gitignore`.
