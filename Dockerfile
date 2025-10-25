# syntax=docker/dockerfile:1

# Base image
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ---- Build stage: install dev deps and build Tailwind CSS ----
FROM base AS build
# Install OS deps if needed (e.g., libc compatibility)
RUN apk add --no-cache bash

# Install dev dependencies
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy only what's needed to build CSS
COPY tailwind.config.js postcss.config.js ./
COPY public ./public

# Build Tailwind CSS (minified)
RUN npm run build:css || (echo "Tailwind build failed, continuing with existing CSS if present" && exit 0)

# ---- Production dependencies (no dev deps) ----
FROM base AS prod-deps
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# ---- Final runtime image ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user (node user already exists in image)
USER node

# Copy production node_modules
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules

# Copy application source
COPY --chown=node:node package*.json ./
COPY --chown=node:node server.js ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node tailwind.config.js postcss.config.js ./

# Overwrite CSS with built artifact if present
COPY --chown=node:node --from=build /app/public/css/tailwind.css ./public/css/tailwind.css

# Expose application port
EXPOSE 3000
ENV PORT=3000

# Healthcheck (simple TCP check)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "require('http').get('http://localhost:'+process.env.PORT,()=>process.exit(0)).on('error',()=>process.exit(1))"

# Start the server
CMD ["node", "server.js"]
