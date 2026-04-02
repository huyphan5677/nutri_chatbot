# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy dependency files and workspace members
COPY pyproject.toml uv.lock README.md ./
COPY libs ./libs

# Install dependencies using uv
RUN uv sync --frozen --no-dev

# Copy source code
COPY src ./src

# Copy entrypoint and make executable
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# # Create non-root user
# RUN useradd -m appuser && chown -R appuser:appuser /app
# USER appuser

# Expose port
EXPOSE 8000

# Run the entrypoint
CMD ["/app/docker-entrypoint.sh"]

# Build image
# docker build -t nutri-backend:latest .

# Push image
# docker tag nutri-backend:latest mocdiep/nutri-backend:30032026_2359
# docker push mocdiep/nutri-backend:30032026_2359
