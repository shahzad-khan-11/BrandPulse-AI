# Database Seeding Guide 💾

This document details the database seeder configuration used for setting up default enterprise metadata and sample development data.

---

## 1. Seeder Configuration
The database seeder is located in [backend/src/database/seeders/seed.js](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/database/seeders/seed.js). It is executable via Node.js directly or via npm package scripts.

### Execution Command:
```bash
npm run db:seed
```

---

## 2. Seeded Elements Overview

### 2.1 Permissions List
Default system permissions loaded:
- `brands:create`: Track new brands.
- `brands:read`: View brand lists.
- `brands:delete`: Remove brands.
- `mentions:read`: Read post hits.
- `mentions:sync`: Trigger crawlers sync.

### 2.2 System Roles Configuration
Seeded Roles:
- **Admin**: Has all permissions.
- **User**: Has `brands:read`, `mentions:read`, and `mentions:sync`.
- **Analyst**: Has `brands:read` and `mentions:read`.

### 2.3 Sample Tenant Data
- **Organization**: "Acme Enterprises" (Slug: `acme-enterprises`, Tier: `growth`).
- **User**: `admin@acme.com` (password `password123`).
- **Brand**: "Acme Corp" (Keywords: `acme`, `acme corp`, `#acme`).
- **BrandMentions**: Installs 3 custom mentions representing a positive post, a neutral news update, and a negative server outage error, complete with Gemini AI mock evaluation metrics (themes, suggested actions, and text reasoning).
- **Daily Timeline**: Seeds aggregate daily sentiment counts (3 total mentions, average sentiment index 0.05).
