# VITato (Prototype)

Campus‑exclusive food delivery for VIT Bhopal.

This repository contains a Node.js + Express backend that serves a static frontend (Tailwind CSS), with MongoDB (Mongoose), JWT auth for student/vendor/rider roles, Socket.IO for realtime updates, and optional Razorpay payments.

## Tech stack
- Node.js 20, Express 4
- MongoDB with Mongoose
- Socket.IO
- Tailwind CSS (prebuilt during Docker build or via script)
- Razorpay (optional when testing payments)

## Quick start (local, without Docker)
Prerequisites: Node 20+, a local MongoDB running.

1) Copy env file and edit values
- cp .env.example .env
- Set at least: MONGO_URI (e.g., mongodb://127.0.0.1:27017/vitato) and JWT_SECRET

2) Install deps and build CSS
- npm ci
- npm run build:css

3) Seed sample data (optional)
- npm run seed

4) Start
- npm start

Open http://localhost:3000

## Run with Docker Compose (recommended)
This spins up the app and MongoDB together.

1) Copy env file and adjust if needed
- cp .env.example .env

2) Build and start
- docker compose up --build

3) Stop
- docker compose down

App: http://localhost:3000
MongoDB: mongodb://localhost:27017 (Compose internal URL is mongodb://mongo:27017/vitato)

Notes:
- Ensure Docker Desktop/daemon is running.
- If you have something else on port 3000, change PORT in .env.

## Environment variables
- PORT: Web server port (default 3000)
- MONGO_URI: Mongo DB connection (Compose default points to mongo service)
- JWT_SECRET: Secret for signing JWTs
- RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET: Only needed to test real payments
- RAZORPAY_WEBHOOK_SECRET: For webhook signature verification (optional)

## Payments and webhook
- Payments are optional in local development. Without Razorpay keys, payment routes will return validation errors as expected.
- If testing webhooks locally, expose the app port (e.g., ngrok) and configure the webhook to POST to:
  - http://localhost:3000/api/payments/webhook

## Scripts
- npm run build:css → build Tailwind to public/css/tailwind.css
- npm run seed → seed demo data
- npm run seed:vendor-users → create vendor users from seed
- npm start → start server
- npm run dev → start with nodemon (hot reload; requires local Node)

## Project structure
- server.js → Express app + Socket.IO bootstrap
- src/models → Mongoose models (User, Vendor, FoodItem, Order, VendorApplication)
- src/routes → API routes (api.js, payment.js, admin.js, vendorApplication.js, vendor.js)
- src/middleware → auth, adminAuth, geoFence
- src/sockets → orderSocket.js
- public → static HTML/JS/CSS
- seed → seed scripts

## Docker details
- Dockerfile → Multi‑stage build; compiles Tailwind and installs only production deps in final image; runs as non‑root; exposes 3000; healthcheck included.
- docker-compose.yml → Starts app and MongoDB; persists DB and uploads; maps ${PORT:-3000}:3000.
- .dockerignore → Keeps the image small and avoids sending secrets to the build context.

## Troubleshooting
- “EADDRINUSE: 3000”: stop the other process or change PORT in .env.
- Docker “Cannot connect to Docker daemon”: start Docker Desktop/daemon.
- CSS missing styles: run npm run build:css (Docker build already runs it).
- Mongo connection errors: verify MONGO_URI and that MongoDB is reachable.

## License
MIT
