# REST API Reference & Swagger Specifications 🔌

BrandPulse AI endpoints are documented using **Swagger/OpenAPI 3.0** specifications.

---

## 1. Swagger UI Access
The interactive documentation is generated dynamically at runtime using `swagger-jsdoc` and `swagger-ui-express`.

- **Access URL**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **Configuration File**: [backend/src/config/swagger.js](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/config/swagger.js)

---

## 2. API Endpoints Map

### 2.1 Authentication (/api/auth)
- `POST /api/auth/register` (Public): Register a user and organization.
- `POST /api/auth/login` (Public): Login and get tokens.
- `POST /api/auth/refresh` (Public): Rotate JWT tokens.
- `POST /api/auth/logout` (Public): Revoke refresh token and log out.
- `POST /api/auth/verify-email` (Public): Verify email using verification token.
- `POST /api/auth/forgot-password` (Public): Sends password reset link.
- `POST /api/auth/reset-password` (Public): Resets password using reset token.
- `GET /api/auth/profile` (Private): Gets authenticated profile.

### 2.2 Brands (/api/brands)
- `POST /api/brands` (Private): Create a brand profile.
- `GET /api/brands` (Private): Paginated brand listing.
- `GET /api/brands/:id` (Private): Get specific brand details.
- `DELETE /api/brands/:id` (Private): Soft delete brand and associated mentions.

### 2.3 Brand Mentions (/api/mentions)
- `GET /api/mentions/brand/:brandId` (Private): Paginated mentions listing with filters (source, sentiment, search).
- `POST /api/mentions/brand/:brandId` (Private): Manually log a review (Triggers Gemini AI analysis).
- `POST /api/mentions/brand/:brandId/sync` (Private): Simulates background web crawling.
- `GET /api/mentions/brand/:brandId/metrics` (Private): Retrieve timeline and source metrics for charts.

### 2.4 Organizations (/api/organizations)
- `GET /api/organizations` (Private): Get organization details.
- `PUT /api/organizations/tier` (Private/Admin): Update organization billing tier.

### 2.5 Team Users (/api/users)
- `GET /api/users` (Private/Admin): Paginated user lists.
- `PUT /api/users/profile` (Private): Update profile.
- `DELETE /api/users/:id` (Private/Admin): Soft delete team user.

### 2.6 Reports (/api/reports)
- `GET /api/reports/brand/:brandId` (Private): Get report listing.
- `POST /api/reports/brand/:brandId` (Private): Create report (Supports uploading attachments up to 5MB using Multer).
- `DELETE /api/reports/:id` (Private): Delete report.

### 2.7 Notifications & Dashboard (/api/notifications & /api/dashboard)
- `GET /api/notifications` (Private): Fetch unread alerts.
- `PUT /api/notifications/read` (Private): Mark all alerts read.
- `GET /api/dashboard/stats` (Private): Consolidated stats across all brands.

### 2.8 System Admin & Workflows (/api/admin & /api/workflows)
- `GET /api/admin/health` (Private/Admin): Check database connections and liveness.
- `POST /api/admin/backup` (Private/Admin): Trigger structure metadata backup exports.
- `GET /api/workflows/logs` (Private/Admin): List crawler and webhook executions.
