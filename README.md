# VITato (Prototype)

Campus-exclusive food delivery platform for VIT Bhopal.

## Stack
- Node.js + Express
- MongoDB + Mongoose
- JWT (email/password) stateless authentication
- TailwindCSS (no React)
- Socket.io for realtime order tracking

## Pages
- `/` Landing + sign in
- `/menu.html` Menu browsing & add to cart
- `/cart.html` Review and checkout
- `/track.html?order=<id>` Order tracking

## Dev Setup
1. Install dependencies
```
npm install
```
2. Create `.env` file
```
MONGO_URI=mongodb://127.0.0.1:27017/vitato
SESSION_SECRET=change_me
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
ALLOWED_SUBNETS=10.0.0.,192.168.1.
ENFORCE_GEOFENCE=false
```
3. Build CSS (once, or run in watch via a separate tool)
```
npx tailwindcss -i ./public/css/tailwind.input.css -o ./public/css/tailwind.css --watch
```
4. Seed data (in another terminal)
```
node seed/seedData.js
```
5. Start server
```
npm run dev
```

## Notes
- Auth now uses signup/login returning a JWT (stored in localStorage). Include Authorization: Bearer <token> on protected requests.
- Geo-fence currently checks IP prefixes; replace with more robust subnet check or location-based verification.
- Delivery partner assignment & status updates would be handled by vendor/admin interfaces not yet implemented.

## Next Steps
- Implement real Google OAuth routes & session handling in UI
- Add protected route middleware for static pages (serve different HTML if not authed)
- Delivery partner dashboard for accepting orders and updating statuses
- Better image handling & file uploads
- Performance optimizations & caching
