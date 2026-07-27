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

# Vite bakes VITE_* env vars into the bundle at build time, so they must be
# present during `RUN npm run build`, not just at runtime. Railway passes
# service variables as Docker build-args when a matching ARG exists; the ENV
# instruction then exposes them to the build process via process.env.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Now copy the rest of the source and build.
COPY . .
RUN npm run build

# Railway injects PORT at runtime; EXPOSE here is informational only.
EXPOSE 8080
CMD ["npm", "start"]
