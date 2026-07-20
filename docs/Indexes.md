# Database Indexation Strategy ⚡

Indexes are built during database boot to ensure queries scale linearly as data sizes grow.

---

## 1. Configured System Indexes

### 1.1 `users`
- `{ email: 1 }` (Unique, Ascending): Speeds up authentication lookups and guarantees email uniqueness.
- `{ role: 1 }`: Optimizes administrative user management queries.
- `{ organization: 1 }`: Speeds up team directory queries.

### 1.2 `organizations`
- `{ slug: 1 }` (Unique, Ascending): Speeds up tenant routing resolutions.

### 1.3 `brands`
- `{ name: 1 }`: Speeds up lookup by brand names.
- `{ organization: 1 }`: Fast listings of brands belonging to a specific organization.
- `{ createdBy: 1 }`: Fast brand queries filtered by owner.

### 1.4 `brandmentions`
- `{ brand: 1, publishedAt: -1 }` (Compound): Matches standard dashboard feeds querying paginated mentions for a brand sorted by newest.
- `{ brand: 1, sentiment: 1 }` (Compound): Optimizes aggregation queries calculating positive/neutral/negative counts per brand.
- `{ source: 1 }`: Speeds up channel breakdown chart calculations.

### 1.5 `sentiments`
- `{ brand: 1, date: -1 }` (Unique Compound): Prevents multiple daily timeline updates for the same brand and optimizes weekly timeline chart outputs.

### 1.6 `apikeys`
- `{ hashedKey: 1 }` (Unique, selected false): Matches incoming API authentication keys quickly while preserving key hashes.

---

## 2. Infrastructure Indexes (Soft Delete)
A database-wide index is configured for soft delete:
- `{ isDeleted: 1 }` on all collections.
Since Mongoose middleware automatically appends `{ isDeleted: false }` to all standard queries, this index guarantees that queries do not perform full table scans evaluating deleted flags.
