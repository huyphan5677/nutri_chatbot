# Authentication

This document describes the authentication architecture, token lifecycle, Google OAuth integration, and session management in the Nutri frontend.

---

## 1. Authentication Methods

The application supports two authentication methods:

| Method              | Backend Endpoint         | Request Format           |
| ------------------- | ------------------------ | ------------------------ |
| Email/Password      | `POST /auth/login`       | `multipart/form-data`    |
| Email Registration  | `POST /auth/register`    | `application/json`       |
| Google OAuth 2.0    | `POST /auth/google`      | `application/json`       |

All three flows produce the same output: a JWT `access_token` string that the frontend stores and uses for subsequent API calls.

---

## 2. Token Lifecycle

### Storage

The JWT is stored in `localStorage` under the key `nutri_token`:

```typescript
localStorage.setItem("nutri_token", token);
```

### Attachment

The shared Axios client (`shared/api/client.ts`) uses a request interceptor to attach the token automatically:

```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nutri_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

For API modules that use `fetch()` directly (recipes, collections, system logs), the token is manually read from `localStorage` and added to headers:

```typescript
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("nutri_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};
```

### Removal

On logout, the token is removed and the page is fully reloaded:

```typescript
localStorage.removeItem("nutri_token");
window.location.href = "/";
```

### Expiry Handling

There is **no client-side token expiry handling**. The frontend does not decode the JWT, check `exp` claims, or implement refresh token rotation. If the token expires:

1. Backend API calls will return `401 Unauthorized`.
2. These errors are caught by individual component error handlers.
3. The user experience may degrade silently until they manually log out and back in.

This is a known gap that should be addressed with a response interceptor that redirects to login on 401.

---

## 3. Email/Password Authentication

### Login Flow

```
User enters email + password in AuthModal
    |
    v
AuthModal.handleSubmit()
    |
    +--> Build FormData (OAuth2PasswordRequestForm format)
    |      formData.append("username", email)
    |      formData.append("password", password)
    |
    +--> POST /auth/login
    |      Content-Type: multipart/form-data (browser-set)
    |
    v
Response: { access_token: "..." }
    |
    v
handleLoginSuccess(token)
    |
    +--> localStorage.setItem("nutri_token", token)
    +--> Callback to parent component
    +--> Close modal
```

Note the login endpoint expects `multipart/form-data` (FastAPI's `OAuth2PasswordRequestForm`), not JSON. The field name is `username` (not `email`) per the OAuth2 spec.

### Registration Flow

```
User enters name, email, password in AuthModal (signup mode)
    |
    v
AuthModal.handleSubmit()
    |
    +--> POST /auth/register
    |      Content-Type: application/json
    |      Body: { email, password, full_name }
    |
    v
Response: { access_token: "..." }
    |
    v
handleLoginSuccess(token)  [same as login]
```

---

## 4. Google OAuth 2.0 Integration

### Provider Setup

The `GoogleOAuthProvider` from `@react-oauth/google` wraps the entire application in `main.tsx`:

```typescript
const getGoogleClientId = () => {
  // Priority: runtime env (Docker) > build-time env > fallback
  if (window.ENV?.VITE_GOOGLE_CLIENT_ID) {
    return window.ENV.VITE_GOOGLE_CLIENT_ID;
  }
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID";
};
```

### OAuth Flow

```
User clicks "Continue with Google" button
    |
    v
GoogleLoginButton component
    |
    +--> useGoogleLogin() hook from @react-oauth/google
    |      - Opens Google consent popup
    |      - Returns an access_token (not ID token)
    |
    v
onSuccess callback with tokenResponse.access_token
    |
    v
AuthModal.handleGoogleSuccess(accessToken)
    |
    +--> POST /auth/google
    |      Body: { token: accessToken }
    |
    v
Backend verifies Google access token
    |
    +--> Creates or finds user
    +--> Returns { access_token: "..." }
    |
    v
handleLoginSuccess(token)  [same flow as email login]
```

### Key Points

- The Google OAuth flow uses the **implicit grant** (access token), not the authorization code flow.
- The access token from Google is sent to the backend, which validates it against Google's API and issues its own JWT.
- The `GoogleLoginButton` is defined as a separate component because the `useGoogleLogin` hook must be called within the `GoogleOAuthProvider` context.

---

## 5. AuthModal Component

### Location
`features/auth/components/AuthModal.tsx`

### Props

| Prop             | Type                            | Description                                |
| ---------------- | ------------------------------- | ------------------------------------------ |
| `isOpen`         | `boolean`                       | Controls modal visibility                  |
| `onClose`        | `() => void`                    | Callback to close the modal                |
| `onLoginSuccess` | `(token: string) => void`       | Callback invoked after successful auth     |
| `initialMode`    | `"login" \| "signup"`           | Initial tab to show (default: `"login"`)   |

### Features

- Toggleable login/signup mode within the same modal.
- Error normalization: maps backend error messages to user-friendly text.
- Loading state disables the submit button during API calls.
- Clears error state when the user starts typing or switches mode.
- Responsive design with backdrop blur and smooth entry animation.

### Error Normalization

```typescript
const normalizeAuthError = (message?: string) => {
  const msg = (message || "").toLowerCase();
  if (msg.includes("incorrect") || msg.includes("password") || msg.includes("credential")) {
    return "Email or password is incorrect. Please try again or sign up.";
  }
  return message || "Login failed. Please try again.";
};
```

---

## 6. Auth State Usage

### User Profile Fetching

Multiple components independently fetch the current user profile from `GET /auth/me`:

| Component         | Fetches user on mount | Uses for                           |
| ------------------ | --------------------- | ---------------------------------- |
| `MainLayout`       | Yes                   | Onboarding status check            |
| `Navbar`           | Yes                   | Display user name                  |
| `DashboardPage`    | Yes                   | Display greeting with user name    |
| `ProfilePage`      | Yes                   | Display account name               |
| `HomePage`         | Yes                   | Check if already logged in         |

This results in multiple redundant `/auth/me` calls on page load. A centralized user context or a shared hook would eliminate these duplicate requests.

### Token as Sole Auth Indicator

Throughout the application, the presence of `nutri_token` in `localStorage` is used as the sole indicator of authentication state. There is no in-memory auth state, no React context for auth, and no decoded token claims available to components.

---

## 7. Security Considerations

| Concern                | Current Status                                              |
| ---------------------- | ----------------------------------------------------------- |
| Token storage          | `localStorage` (vulnerable to XSS, standard for SPAs)      |
| Token expiry handling  | Not implemented client-side                                 |
| CSRF protection        | Not applicable (Bearer token auth, no cookies)              |
| Token refresh          | Not implemented                                             |
| Logout on 401          | Not implemented (no global response interceptor)            |
| Password field masking | Input type `password` is used correctly                     |
| Secure transport       | Enforced by deployment configuration (HTTPS)                |
