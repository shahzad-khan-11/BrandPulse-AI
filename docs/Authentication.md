# Authentication & Authorization (RBAC) Architecture 🔐

BrandPulse AI implements standard stateless JWT authentication coupled with secure Refresh Token rotation and Role-Based Access Control (RBAC).

---

## 1. Authentication Flow

### 1.1 User Registration
- Checks if the email is already registered.
- Encrypts user password using `bcryptjs` with 10 salt rounds.
- Generates a crypto-secure `verificationToken` and sends a verification link via email.
- Returns a JWT `accessToken` (expiring in 15 minutes) and a `refreshToken` (expiring in 7 days).

### 1.2 User Login
- Validates credentials using `bcrypt.compare`.
- Returns access and refresh token pairs.

### 1.3 Token Rotation & Rotation Lifecycle
When the access token expires, the client calls the `/api/auth/refresh` endpoint, sending the refresh token in the request body.
- The server checks if the refresh token is active and valid (not revoked and not expired) inside the `refreshtokens` collection.
- To prevent replay attacks, the server **immediately revokes** the received token (Token Rotation).
- The server generates and returns a new access/refresh token pair.

### 1.4 Logout
- Revokes the refresh token inside the database, preventing future token rotations.

---

## 2. Authorization & RBAC Middleware ([backend/src/middleware/permission.js](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/backend/src/middleware/permission.js))

The authorization layer enforces strict validation of permissions:

- **Middleware call**: `checkPermission('permission_tag')` (e.g. `checkPermission('brands:create')`).
- **Access Check**:
  1. Resolves the user's `roleRef` to retrieve the associated `permissions` list.
  2. If the required permission string exists in the user's permission array, access is granted.
  3. If not, a `403 Forbidden` response is returned.
- **Admin Bypass**: Users with a role string matching `admin` bypass all permission checks, ensuring easy administrative operations.
