# Use an official Node runtime with build tools installed
FROM node:20-bullseye-slim

# Install compilers and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    openjdk-17-jdk \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package manifests and install dependencies for backend and frontend
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
RUN cd backend && npm ci
RUN cd frontend && npm ci

# Build frontend
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Copy backend source
COPY backend/ backend/

# Expose port and start backend
EXPOSE 4000
CMD ["npm", "--prefix", "backend", "start"]
