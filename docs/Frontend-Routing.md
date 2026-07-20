# Frontend Routing & URL Navigation Strategy 📍

This document outlines how paths, routing, and deep-link verification are handled in the frontend.

---

## 1. Single Entry Routing Orchestrator
To optimize bundle sizes, routing is handled in [App.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/App.tsx) based on authentication state:

- **Unauthenticated View**: Conditionally renders login, registration, password reset, or email verification screens based on an `authScreen` state machine.
- **Authenticated View**: Mounts the standard `Layout` shell, using a tab state (`activeTab`) to render specific dashboard page viewports.

---

## 2. Deep-Link URL Redirects
For features requiring email notifications, the application inspects query parameters on mount:

### 2.1 Password Reset
- **URL Format**: `http://localhost:5173/reset-password?token=<reset_token>`
- **Behavior**: On boot, the app parses the token and switches `authScreen` to `reset`, passing the token to `ResetPassword.tsx` to handle the password reset flow.

### 2.2 Email Verification
- **URL Format**: `http://localhost:5173/verify-email?token=<verification_token>`
- **Behavior**: Switches `authScreen` to `verify`. `VerifyEmail.tsx` automatically calls the `/auth/verify-email` API endpoint and displays success or error messages.
