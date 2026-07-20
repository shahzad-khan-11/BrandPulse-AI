# Performance Optimizations Report ⚡

This document details the performance optimizations implemented across the BrandPulse AI stack.

---

## 1. Frontend & Client Optimizations

### 1.1 Multi-stage Production Build (Vite + Nginx)
- Frontend Dockerfile compiles assets using node and serves them via Nginx.
- Enables high concurrency, compression, and sub-millisecond response times for static files.

### 1.2 Chart Rendering
- Recharts responsive containers are optimized using wrapper sizes, preventing unnecessary layout reflows during viewport adjustments.

### 1.3 Bundle Sizes
- Clean bundle chunking compiles in `1.02s` without redundant packages or unused import chains.

---

## 2. Backend & Database Optimizations

### 2.1 Mongoose Indexation Strategy
- Unique compound indexes (`{ brand: 1, publishedAt: -1 }` and `{ brand: 1, date: -1 }`) speed up timeline dashboard queries.
- Database-wide `{ isDeleted: 1 }` index prevents full collection scans when filtering soft-deleted records.

### 2.2 Cached Sentiment Aggregates
- Timelines query precomputed records from the `sentiments` collection instead of calculating statistics on thousands of mentions on page load.

### 2.3 Parallel Database Execution
- Paginated listing helper uses `Promise.all` to query database records and counts concurrently, reducing query times.
