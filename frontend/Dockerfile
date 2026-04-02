# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy build artifacts from builder stage (Vite builds to /dist by default)
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add script to inject runtime environment variables
COPY env-config.sh /docker-entrypoint.d/
RUN sed -i 's/\r$//' /docker-entrypoint.d/env-config.sh && \
    chmod +x /docker-entrypoint.d/env-config.sh

EXPOSE 80

# Build image
# docker build -t nutri-frontend:latest .

# Push image
# docker tag nutri-frontend:latest mocdiep/nutri-frontend:30032026_2300
# docker push mocdiep/nutri-frontend:30032026_2300
