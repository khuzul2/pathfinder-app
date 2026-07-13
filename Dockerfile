# --- Stage 1: install + build both workspaces -----------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install with the exact lockfile first (better layer caching).
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN npm ci

COPY . .

# The Mapbox public token is client-safe and baked into the static bundle by design.
# Server secrets (ORS/OpenWeather) are NEVER build args — they mount at runtime.
ARG VITE_MAPBOX_ACCESS_TOKEN
ENV VITE_MAPBOX_ACCESS_TOKEN=$VITE_MAPBOX_ACCESS_TOKEN
RUN npm run build

# --- Stage 2: minimal production runtime ----------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Backend production dependencies only.
COPY backend/package.json ./package.json
RUN npm install --omit=dev --no-package-lock && npm cache clean --force

# Compiled backend + built frontend (served as ./public by Express).
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/frontend/dist ./public

EXPOSE 8080
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:8080/healthz || exit 1
CMD ["node", "dist/server.js"]
