# VITato (Prototype)

Campus‑exclusive food delivery for VIT Bhopal.

## What’s inside
- Node.js + Express API and static frontend (Tailwind CSS)
- MongoDB (Mongoose models)
- JWT auth (student, vendor, rider)
- Socket.io realtime order updates
- Razorpay payments (optional in local)

## Quick start (without Docker)
Prereqs: Node 20+, MongoDB running locally, PowerShell.

1) Copy .env.example to .env (create one if missing) and set:
	- MONGO_URI=mongodb://127.0.0.1:27017/vitatoo
	- JWT_SECRET=change-me
	- RAZORPAY_KEY_ID=your_key_id (optional)
	- RAZORPAY_KEY_SECRET=your_key_secret (optional)

2) Install deps and build CSS:
	- npm ci
	- npm run build:css

3) Seed sample data (optional):
	- npm run seed

4) Start the server:
	- npm start

Open http://localhost:3000

## Run with Docker (single container)
Good for quick checks when you already have MongoDB elsewhere.

1) Ensure .env has your values or pass env vars at run time.
2) Build the image:
	- docker build -t vitatoo .
3) Run the container (replace MONGO_URI if needed):
	- docker run -p 3000:3000 -e MONGO_URI="mongodb://host.docker.internal:27017/vitatoo" -e JWT_SECRET="change-me" vitatoo

Open http://localhost:3000

## Run with Docker Compose (app + Mongo)
This is the simplest way for beginners—Compose spins up Mongo and the app together.

1) Edit docker-compose.yml env values if needed.
2) Start both services:
	- docker compose up --build
3) Stop:
	- docker compose down

App runs on http://localhost:3000, Mongo on mongodb://localhost:27017

## Environment variables
- PORT: Web server port (default 3000)
- MONGO_URI: Mongo connection string
- JWT_SECRET: Token secret
- RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET: Only required if testing real payments
- CLIENT_ORIGIN: CORS origin if you serve frontend elsewhere (optional)

## Common FAQs
- CSS looks broken? Run "npm run build:css". In Docker, the build step already does this.
- Payments failing locally? Use test keys and configure Razorpay webhooks to your public URL (e.g., via ngrok). Not required for basic browsing.
- Can I develop with hot-reload? Yes: npm run dev (requires local Node, not Docker runtime).

## Scripts
- npm run build:css → builds Tailwind into public/css/tailwind.css
- npm run seed → seeds demo data into Mongo
- npm start → starts Express server

## Project structure (important bits)
- server.js → Express app setup + Socket.io
- src/ → models, routes, sockets
- public/ → HTML, JS, CSS (static frontend)

Enjoy hacking! If you get stuck, check terminal logs first—they usually tell you what’s missing.

