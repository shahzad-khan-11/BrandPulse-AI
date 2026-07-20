# BrandPulse AI - Backend Implementation Guide ⚙️

This document describes the design patterns, layer configurations, and services implemented in the backend of **BrandPulse AI**.

---

## 1. Modular Architecture Layout
The backend uses standard ES Modules (`import`/`export`) and is structured into distinct functional layers:

- **App Initialization** ([backend/src/app.js](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/app.js)): Handles security configurations, body parsers, CORS settings, rate limiting, and mapping routing.
- **REST Routers** ([backend/src/routes/](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/routes/)): Exposes endpoint routes and secures them with validation, authentication, and permission middlewares.
- **Controllers** ([backend/src/controllers/](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/controllers/)): Intercepts requests, coordinates business service flows, and writes JSON replies.
- **Services** ([backend/src/services/](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/services/)): Outward integrations logic, including Gemini AI prompts, Nodemailer email dispatches, and secure webhook notifications.
- **Repositories** ([backend/src/repositories/](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/repositories/)): Shared database queries extending `BaseRepository` to prevent duplicate code.

---

## 2. Infrastructure Services

### 2.1 Gemini AI Service ([backend/src/services/geminiService.js](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/services/geminiService.js))
- Integrates with the Google Generative AI SDK, targeting the **Gemini 1.5 Flash** model.
- Uses JSON schema responses (`responseMimeType: 'application/json'`) to enforce structured data returns containing sentiment scores, themes, emotional tones, and suggested actions.
- Automatically falls back to a local heuristic parsing engine if the API key is not configured, keeping dashboards online.

### 2.2 Mail Service ([backend/src/services/emailService.js](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/services/emailService.js))
- Uses `nodemailer` to dispatch SMTP alerts.
- Supports **Welcome**, **Password Reset**, and **Email Verification** templates.
- Automatically falls back to **Ethereal Mailer** or **Console Logging** if no SMTP variables are present in the environment configuration, enabling offline development.

### 2.3 Webhook Dispatches ([backend/src/services/webhookService.js](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/services/webhookService.js))
- Sends webhook notifications to external platforms (such as n8n) on specific events (such as negative sentiment alerts).
- Signs the request payload using **HMAC-SHA256** and appends the signature to the `X-BrandPulse-Signature` header for verification.

---

## 3. Health Checks & Probes
- **Liveness Probe** (`/health/liveness`): Instantly checks if the Node process is running.
- **Readiness Probe** (`/health/readiness`): Verifies if MongoDB is connected successfully, returning `503 Service Unavailable` on database connection failure.
- **Legacy Health** (`/health`): Returns basic JSON status metrics for backward compatibility.
