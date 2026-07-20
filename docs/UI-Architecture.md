# User Interface Design & State Architecture 🎨

This document describes the design system and state architecture implemented in the BrandPulse AI client.

---

## 1. Unified State Architecture (AuthContext)
Global state is managed by a single Context Provider ([AuthContext.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/context/AuthContext.tsx)):
- **Reactivity**: Automatically broadcasts session changes, user details updates, and theme preferences to all children.
- **Boot Interceptor**: Evaluates token presence on page load to verify sessions before mounting layout shells.
- **Theme Sync**: Syncs state to root DOM classes for dark/light themes.

---

## 2. API Layer & Refresh Rotation
- **Global Instance**: Axios client configured with headers, timeouts, and `baseURL` paths.
- **Request Interceptor**: Appends JWT credentials automatically on each outbound request.
- **Token Rotation Handler**: If a `401 Unauthorized` is returned:
  1. Blocks further API calls using an `isRefreshing` lock flag.
  2. Queues pending requests.
  3. Sends `refreshToken` to `/auth/refresh` to request a rotated credentials pair.
  4. Resolves the queue and retries the original request.
  5. Clears storage and redirects to the login screen on refresh token expiration.

---

## 3. Dark Mode & Styling Tokens
- **Base Grid**: 8px sizing grid.
- **Grays**: Slate color family (`bg-slate-50` to `bg-slate-950`).
- **Accent**: Deep Indigo (`text-indigo-600`, `bg-indigo-600`) and Purple gradients.
- **Transitions**: `transition-all duration-200` on hover states.
- **Glassmorphism**: Backdrop blur combinations on authentication containers (`backdrop-blur-xl bg-slate-800/50`).
