# Use an official Node runtime with build tools installed
FROM node:20-bullseye-slim

# Build args for frontend build-time envs (Vite reads these at build-time)
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_API_URL=""

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

# Copy frontend source and build with build-time envs
COPY frontend/ frontend/
ENV NODE_ENV=production
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_API_URL=${VITE_API_URL}
RUN cd frontend && VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID} VITE_API_URL=${VITE_API_URL} npm run build

# Copy backend source
COPY backend/ backend/

# Expose port and start backend
EXPOSE 4000
CMD ["npm", "--prefix", "backend", "start"]
