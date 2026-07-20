# Database Collections Reference 📁

BrandPulse AI manages the following collections in MongoDB. All collection names are managed as pluralized lowercase strings by Mongoose.

---

## 1. Primary Collections

### 1.1 `users`
Tracks developer and client user accounts.
- **Key Fields**: `name`, `email`, `password`, `role` (user/admin/analyst), `roleRef` (ObjectId), `organization` (ObjectId).
- **Security**: Password selected false by default.

### 1.2 `organizations`
Groups brands, billing tiers, and team users.
- **Key Fields**: `name`, `slug` (slugified URL key), `billingTier` (free/growth/enterprise).

### 1.3 `brands`
Tracks monitored entities and keyword search keys.
- **Key Fields**: `name`, `keywords` (string array), `organization` (ObjectId), `createdBy` (ObjectId).

### 1.4 `brandmentions`
Stores crawlers output hits, social posts, reviews, and Gemini AI outputs.
- **Key Fields**: `brand` (ObjectId), `source` (twitter/reddit/news/web/custom), `content`, `author`, `url`, `publishedAt`, `sentiment` (positive/neutral/negative), `sentimentScore` (-1.0 to 1.0), `aiAnalysis` (keyThemes, emotionalTone, suggestedAction, explanation).

---

## 2. Infrastructure & Metadata Collections

### 2.1 `sentiments`
Pre-aggregates daily brand sentiment stats to optimize charts.
- **Key Fields**: `brand` (ObjectId), `date`, `averageScore`, `positiveCount`, `neutralCount`, `negativeCount`, `totalCount`.

### 2.2 `analytics`
Caches dashboard timelines and channel distributions.
- **Key Fields**: `brand` (ObjectId), `metricType`, `value`, `calculationDate`.

### 2.3 `reports`
Tracks user-exported PDFs and Excel brand status files.
- **Key Fields**: `name`, `brand` (ObjectId), `organization` (ObjectId), `status` (pending/completed/failed), `fileUrl`, `summary`, `createdBy` (ObjectId).

### 2.4 `notifications`
Supports in-app alert flags.
- **Key Fields**: `recipient` (ObjectId), `title`, `message`, `type` (info/warning/error/mention_alert), `isRead` (boolean).

---

## 3. Logs & Audit Collections

### 3.1 `activitylogs`
Standard user operations log tracker.
- **Key Fields**: `user` (ObjectId), `action`, `description`, `ipAddress`.

### 3.2 `auditlogs`
High-severity security tracker (e.g. key rotations, auth failures).
- **Key Fields**: `user` (ObjectId), `action`, `severity` (low/medium/high/critical), `details` (Mixed), `ipAddress`, `userAgent`.

### 3.3 `workflowlogs`
Sync crawls and API webhook run statuses.
- **Key Fields**: `brand` (ObjectId), `workflowType` (sync_mentions/ai_enrichment/n8n_webhook_dispatch), `status` (pending/running/completed/failed), `result` (Mixed), `error`.

---

## 4. Auth & Keys Integration Collections

### 4.1 `apikeys`
Outbound Developer API integration credentials.
- **Key Fields**: `organization` (ObjectId), `user` (ObjectId), `name`, `keyPrefix`, `hashedKey` (selected false), `isActive` (boolean), `expiresAt`, `lastUsedAt`.

### 4.2 `refreshtokens`
JWT persistence session management.
- **Key Fields**: `user` (ObjectId), `token`, `expiresAt`, `isRevoked` (boolean).

### 4.3 `roles`
Configures user permission groups.
- **Key Fields**: `name`, `description`, `permissions` (ObjectId array).

### 4.4 `permissions`
Individual authorization nodes.
- **Key Fields**: `name`, `description`.
