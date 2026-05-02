# Single-stage build for the unified Express+Vite app. We bypass Nixpacks
# because the Railway-managed nixpacks image was hanging on metadata loads.
# Workspaces are installed at the root; the build runs frontend → backend
# (see root package.json's "build" script) and the start script serves the
# Vite dist through Express.

FROM node:22-slim

WORKDIR /app

# Copy manifests first so a code-only change doesn't bust the install cache.
COPY package*.json ./
COPY frontend/package*.json frontend/
COPY backend/package*.json backend/

# --include=dev forces typescript/vite/tsx in even when NODE_ENV=production
# is already set in the build environment.
RUN npm install --include=dev

# Now copy the rest of the source and build.
COPY . .
RUN npm run build

# Railway injects PORT at runtime; EXPOSE here is informational only.
EXPOSE 8080
CMD ["npm", "start"]
