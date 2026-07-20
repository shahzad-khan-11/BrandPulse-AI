# BrandPulse AI - Frontend Implementation Guide 💻

This document details the configuration and folder structure of the **BrandPulse AI** React client.

---

## 1. Modular Organization Layout
The client uses React with Vite, configured with TypeScript and Tailwind CSS. The codebase is broken down into structured directories:

- **Auth Context** ([frontend/src/context/AuthContext.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/context/AuthContext.tsx)): Houses session variables, register/login handlers, and theme syncing.
- **API Client** ([frontend/src/services/api.ts](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/services/api.ts)): Coordinates Axios requests and processes token refresh queues during expiry intervals.
- **Custom Hooks** ([frontend/src/hooks/useAuth.ts](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/hooks/useAuth.ts)): Simplifies AuthContext consumption.
- **Sub-pages** ([frontend/src/pages/](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/pages/)):
  - `Login`, `Register`, `ForgotPassword`, `ResetPassword`, `VerifyEmail`.
  - `Dashboard` (Main metrics and charts), `Brands` (Target workspace configuration), `Mentions` (Filters feed list), `Reports` (Multer uploads), `AdminPanel` (Org teams and database checks).
- **Core Layout** ([frontend/src/components/Layout.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/components/Layout.tsx)): Orchestrates responsive sidebar drawers and notification dropdown centers.
- **Analytics Charts** ([frontend/src/components/AnalyticsCharts.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/components/AnalyticsCharts.tsx)): Area charts built using Recharts.

---

## 2. Global Styling & Themes
- Styling is implemented using Tailwind CSS utility classes.
- Supports a toggleable dark mode (which syncs a `.dark` class to the root `html` element).
- Design follows dark slate tones, premium indigo/purple gradients, and glassmorphism cards.
