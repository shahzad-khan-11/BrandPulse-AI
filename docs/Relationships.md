# Database Relationships Schema 🔗

This document maps collection references, cascading soft deletes, and virtual mappings.

---

## 1. Mongoose Model Reference Maps

```text
  [Organization] 
        │
        ├── (1:N) ──> [User] ── (1:N) ──> [APIKey]
        │               │
        │               └── (1:N) ──> [RefreshToken]
        │
        └── (1:N) ──> [Brand] ── (1:N) ──> [BrandMention]
                       │                     │
                       │                     └── (1:N) ──> [WorkflowLog]
                       │
                       ├── (1:N) ──> [Sentiment]
                       └── (1:N) ──> [Analytics]
```

---

## 2. Entity Relations Details

### 2.1 Users & Organizations
- **Fields**: `User.organization` is an `ObjectId` referencing the `Organization` collection.
- **Cascading Policy**: If an organization is soft-deleted (`isDeleted: true`), the corresponding middleware filters out queries matching its users and brands, cascading the visibility scope.

### 2.2 Users, Roles & Permissions
- **User Role**: `User.roleRef` references the `Role` collection, with `User.role` kept as a string for fast authorization checks.
- **Role Permissions**: `Role.permissions` is an array of `ObjectId` references to the `Permission` collection.

### 2.3 Brands & BrandMentions
- **Relation**: `BrandMention.brand` references the `Brand` collection.
- **Mongoose Virtuals**: `Brand` defines a virtual field `mentions` referencing the `BrandMention` collection (mapping `Brand._id` to `BrandMention.brand`).

### 2.4 Reports, Analytics & Audits
- **Reports**: Reference `Brand`, `Organization`, and `User` (creator).
- **Log collections**: `ActivityLog` and `AuditLog` reference `User` objects.
- **Workflow logs**: `WorkflowLog` references the parent `Brand` triggering the crawler job.
