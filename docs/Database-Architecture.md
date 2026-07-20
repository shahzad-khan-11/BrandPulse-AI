# BrandPulse AI - Database Architecture 🗄️

This document describes the high-level design, connection strategies, and patterns implemented in the database layer of **BrandPulse AI**.

---

## 1. Mongoose Object-Document Mapper (ODM)
We use Mongoose as our ODM to enforce structured schemas on top of MongoDB, providing rich validation, default values, query middlewares, and lifecycle hooks.

---

## 2. Layer Separation: Repository Pattern
To decoupled database operations from Express route controllers, the codebase uses a **Repository Pattern** located in `backend/src/repositories/`.

- **BaseRepository**: A reusable generic repository class (`BaseRepository.js`) providing shared CRUD logic (e.g. `find`, `findOne`, `create`, `update`, `delete`, `restore`, `paginate`).
- **Child Repositories**: Specific entities inherit from `BaseRepository` and define specialized domain queries (e.g., `UserRepository.findByEmail()`).

---

## 3. Core Database Utilities

### 3.1 Database Connection Manager
The connection manager (`backend/src/database/index.js`) configures mongoose and registers lifecycle hooks:
- **Auto-Reconnection**: Listens for connection drops and attempts auto-reconnection.
- **Boot Safety**: Implements a `5000ms` connection timeout (`serverSelectionTimeoutMS`) so that database outages do not block web server process boot in offline/local dev modes.

### 3.2 Health Check Utility
Exposes a `healthCheck()` function that queries Mongoose connection readyState flags:
- `0`: disconnected
- `1`: connected
- `2`: connecting
- `3`: disconnecting

### 3.3 Query Helpers (Pagination, Filters, Search)
Located in `backend/src/database/helpers/query.js`:
- `paginate(model, filters, options)`: Performs double querying (data fetch + count) in parallel to return optimized pagination metadata.
- `buildSearchQuery(searchString, fields)`: Returns regex-based compound search criteria.
- `parseFilterQuery(reqQuery)`: Strips system parameters (sort, limit) and parses advanced MongoDB filtering operations (gte, lte, gt, lt, ne, in) directly from URLs.

### 3.4 Soft Delete Support
Shared plugin (`backend/src/database/helpers/softDelete.js`) applied to all schema instances:
- Appends `isDeleted` and `deletedAt` flags.
- Overrides mongoose standard query middlewares (`find`, `findOne`, `countDocuments`, `findOneAndUpdate`) to filter out deleted documents automatically unless requested otherwise.
- Exposes `.softDelete()` and `.restore()` instance methods.

### 3.5 Backup Utility (Structure Only)
Located in `backend/src/database/index.js`, dynamically exports database models and collection schemas mapping structure for migrations tracking.
