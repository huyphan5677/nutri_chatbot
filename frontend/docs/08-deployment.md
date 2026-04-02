# Deployment

This document describes the build pipeline, Docker configuration, Nginx setup, environment variable management, and deployment workflow for the Nutri frontend.

---

## 1. Build Pipeline

### NPM Scripts

| Script          | Command                  | Purpose                                    |
| --------------- | ------------------------ | ------------------------------------------ |
| `dev`           | `vite`                   | Start development server with HMR          |
| `build`         | `tsc && vite build`      | Type-check then produce production bundle  |
| `lint`          | `eslint . --ext ts,tsx`  | Run ESLint with zero-warning threshold     |
| `preview`       | `vite preview`           | Preview production build locally           |

### Build Output

The production build outputs to the `dist/` directory (Vite default). The build process:

1. **TypeScript compilation** (`tsc`): Type-checks the entire `src/` directory. Errors here fail the build.
2. **Vite bundling**: Produces optimized, minified JS/CSS bundles with content-hashed filenames for cache busting.

### Development Server

The Vite dev server proxies API requests to the backend:

```typescript
server: {
  proxy: {
    "/api": {
      target: "http://backend:8000",  // Docker mode
      // target: "http://localhost:8000",  // Local mode
      changeOrigin: true,
      secure: false,
    },
  },
},
```

When running locally outside Docker, the proxy target must be manually switched to `http://localhost:8000` in `vite.config.ts`.

---

## 2. Docker Configuration

### Multi-Stage Build

The `Dockerfile` implements a two-stage build:

**Stage 1: Build**
```dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

- Uses Node.js 20 Alpine as the build environment.
- Installs dependencies with `npm ci` (clean install, respects lock file).
- Produces the `dist/` output.

**Stage 2: Serve**
```dockerfile
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY env-config.sh /docker-entrypoint.d/
RUN sed -i 's/\r$//' /docker-entrypoint.d/env-config.sh && \
    chmod +x /docker-entrypoint.d/env-config.sh
EXPOSE 80
```

- Uses Nginx Alpine as the production server.
- Copies the build output, Nginx config, and env injection script.
- The `sed` command strips Windows line endings from the shell script.
- Exposes port 80.

### Image Tagging Convention

```
docker tag nutri-frontend:latest mocdiep/nutri-frontend:DDMMYYYY_HHMM
docker push mocdiep/nutri-frontend:DDMMYYYY_HHMM
```

Images follow a date-time naming convention (e.g., `30032026_2300`).

---

## 3. Nginx Configuration

```nginx
server {
    listen 80;

    # Serve static files with SPA fallback
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy
    resolver 127.0.0.11 valid=30s;
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### Key Points

- **SPA fallback**: `try_files $uri $uri/ /index.html` ensures all client-side routes are handled by React Router.
- **Docker DNS resolver**: `resolver 127.0.0.11` uses Docker's embedded DNS to resolve the `backend` hostname. The `valid=30s` allows graceful handling of container restarts.
- **API proxy**: All `/api/` requests are forwarded to the backend service (`http://backend:8000`), which must be reachable via Docker networking.
- No HTTPS termination is configured here; it is expected to be handled by a reverse proxy or load balancer upstream.

---

## 4. Environment Variables

### Required Variables

| Variable                | Purpose                              | Example                                      |
| ----------------------- | ------------------------------------ | -------------------------------------------- |
| `VITE_API_URL`          | Backend API base URL                 | `/api/v1` or `https://api.nutri.com/api/v1`  |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID           | `811266275321-klsl64...apps.googleusercontent.com` |

### Resolution Strategy

Environment variables are resolved in a two-tier priority system:

```
Priority 1 (Runtime):   window.ENV.VITE_API_URL
Priority 2 (Build-time): import.meta.env.VITE_API_URL
Priority 3 (Fallback):   "/api/v1" (for API URL) or "YOUR_CLIENT_ID" (for Google)
```

### Build-Time Variables (Local Development)

For local development, variables are read from the `.env` file by Vite:

```
VITE_API_URL=/api/v1
VITE_GOOGLE_CLIENT_ID=811266275321-klsl64...apps.googleusercontent.com
```

These are baked into the JavaScript bundle at build time via `import.meta.env.*`.

### Runtime Variables (Docker/Production)

In Docker, the `env-config.sh` script runs at container startup (via Nginx's docker-entrypoint.d mechanism) and generates a `env-config.js` file:

```bash
#!/bin/sh
cat <<EOF > /usr/share/nginx/html/env-config.js
window.ENV = {
  VITE_API_URL: "${VITE_API_URL}",
  VITE_GOOGLE_CLIENT_ID: "${VITE_GOOGLE_CLIENT_ID}"
};
EOF
```

This script injects the runtime environment variables from the Docker container's environment into a JavaScript file that is loaded by `index.html`:

```html
<script src="/env-config.js"></script>
```

This allows the same Docker image to be deployed to different environments (staging, production) by simply changing the container's environment variables, without rebuilding the image.

---

## 5. Deployment Architecture

### Docker Compose Context

The frontend container is designed to run alongside the backend in a Docker Compose environment:

```
+------------------+          +-------------------+
|  Frontend        |   /api/  |   Backend         |
|  (Nginx :80)     |--------->|   (FastAPI :8000)  |
|  nutri-frontend  |          |   backend          |
+------------------+          +-------------------+
```

- The frontend container name must be on the same Docker network as the backend.
- The backend hostname `backend` must resolve via Docker DNS.

### Deployment Workflow

```
1. Local Development
   npm run dev -> Vite dev server with HMR + API proxy

2. Build Docker Image
   docker build -t nutri-frontend:latest .

3. Tag for Registry
   docker tag nutri-frontend:latest mocdiep/nutri-frontend:DDMMYYYY_HHMM

4. Push to Registry
   docker push mocdiep/nutri-frontend:DDMMYYYY_HHMM

5. Deploy
   docker-compose pull && docker-compose up -d
   (with VITE_API_URL and VITE_GOOGLE_CLIENT_ID in environment)
```

---

## 6. Development Workflow

### Local Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Frontend: http://localhost:5173
# API proxy: localhost:5173/api -> localhost:8000

# Type-check
npx tsc --noEmit

# Lint
npm run lint

# Production build test
npm run build
npm run preview
```

### Prerequisites

- Node.js 20+
- npm 9+
- Backend API running at `http://localhost:8000` (or Docker `backend:8000`)

### IDE Configuration

The project includes `.editorconfig` for consistent formatting and a `.vscode/` directory for VS Code settings. TypeScript path aliases (`@/*`) are configured in both `tsconfig.json` and `vite.config.ts` for IDE resolution.
