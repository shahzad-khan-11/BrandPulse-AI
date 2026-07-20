# Environment Setup & Config Reference ⚙Point

This document lists all environment variables required to run BrandPulse AI in development and production environments.

---

## 1. Backend Environment Configurations (`backend/.env`)

| Variable Name | Description | Default / Example Value | Required |
| :--- | :--- | :--- | :--- |
| `PORT` | Port the Node server listens on | `5000` | Yes |
| `NODE_ENV` | Environment mode | `production` \| `development` | Yes |
| `MONGODB_URI` | Connection string for MongoDB | `mongodb://localhost:27017/brandpulse` | Yes |
| `JWT_SECRET` | Secret key used for JWT signing | `bf3e2dbf77c8e9b8849b29...` | Yes |
| `JWT_EXPIRES_IN` | Token validity duration | `15m` | Yes |
| `GEMINI_API_KEY` | API key from Google AI Studio | `AIzaSyD_...` | Yes |
| `FRONTEND_URL` | Client URL (used for CORS settings) | `http://localhost:5173` | Yes |
| `N8N_WEBHOOK_URL` | Outbound n8n dispatch endpoint | `https://n8n.yourcompany.com/webhook/...` | Optional |
| `N8N_WEBHOOK_SECRET` | HMAC signature secret key | `super_secret_webhook_key` | Optional |
| `SMTP_HOST` | Outbound mailer host | `smtp.gmail.com` | Optional |
| `SMTP_PORT` | Outbound mailer port | `587` \| `465` | Optional |
| `SMTP_USER` | SMTP username credentials | `support@company.com` | Optional |
| `SMTP_PASS` | SMTP password credentials | `secure_smtp_password` | Optional |

---

## 2. Frontend Environment Configurations (`frontend/.env`)

| Variable Name | Description | Default / Example Value | Required |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Target backend REST API URL | `http://localhost:5000/api` | Yes |
