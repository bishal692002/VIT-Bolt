# Minimal multi-stage Dockerfile for VITato (Node + Express)

# ---- Build stage: install deps and build Tailwind CSS
FROM node:20-alpine AS builder
WORKDIR /app
# Native build tools are required for some deps on Alpine (e.g., bcrypt)
RUN apk add --no-cache python3 make g++

# Install dependencies first for better caching (use lockfile)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the app
COPY . .

# Build Tailwind CSS (outputs to public/css/tailwind.css)
RUN npm run build:css

# Prune dev dependencies to keep only production deps for runtime
RUN npm prune --omit=dev

# ---- Runtime stage: smaller image with prod deps only
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Copy production node_modules from builder (avoids native rebuilds in runtime)
COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Copy built assets and server code
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./server.js

EXPOSE 3000
CMD ["node", "server.js"]
