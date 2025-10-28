<<<<<<< HEAD
# VIT-Bolt (Prototype)

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
	- MONGO_URI=mongodb://127.0.0.1:27017/vitato
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
	- docker run -p 3000:3000 -e MONGO_URI="mongodb://host.docker.internal:27017/vitato" -e JWT_SECRET="change-me" vitatoo

Open http://localhost:3000

## Run with Docker Compose (app + Mongo)
This is the simplest way for beginners—Compose spins up Mongo and the app together.

1) Edit docker-compose.yml env values if needed (defaults to mongodb://mongo:27017/vitato).
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
  
- npm start → starts Express server

## Project structure (important bits)
- server.js → Express app setup + Socket.io
- src/ → models, routes, sockets
- public/ → HTML, JS, CSS (static frontend)

Enjoy hacking! If you get stuck, check terminal logs first—they usually tell you what’s missing.

=======
# VIT-Bolt 🍔

**Campus-exclusive food delivery platform for VIT Bhopal** with enterprise-grade admin panel.



[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)## What’s inside

[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/)- Node.js + Express API and static frontend (Tailwind CSS)

[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)- MongoDB (Mongoose models)

[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-orange.svg)](https://socket.io/)- JWT auth (student, vendor, rider)

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)- Socket.io realtime order updates

- Razorpay payments (optional in local)

> A comprehensive food delivery platform built for VIT Bhopal students, featuring real-time order tracking, vendor management, and a powerful admin dashboard with analytics.

## Quick start (without Docker)

---Prereqs: Node 20+, MongoDB running locally, PowerShell.



## ✨ Features1) Copy .env.example to .env (create one if missing) and set:

	- MONGO_URI=mongodb://127.0.0.1:27017/vitatoo

### 🎓 For Students	- JWT_SECRET=change-me

- 🍕 Browse campus food vendors and menus	- RAZORPAY_KEY_ID=your_key_id (optional)

- 🛒 Add items to cart and place orders	- RAZORPAY_KEY_SECRET=your_key_secret (optional)

- 💳 Secure payment via Razorpay

- 📍 Real-time order tracking2) Install deps and build CSS:

- 🔔 Live order status updates (no refresh needed)	- npm ci

- 📦 Order history with detailed tracking	- npm run build:css



### 🏪 For Vendors3) Seed sample data (optional):

- 📝 Apply as vendor through online form	- npm run seed

- 🏢 Admin-approved account creation

- 📋 Manage menu items and pricing4) Start the server:

- 📦 Process incoming orders in real-time	- npm start

- 📊 View order history and earnings

- 🔄 Real-time order notificationsOpen http://localhost:3000



### 🏍️ For Delivery Partners## Run with Docker (single container)

- 🚚 View available delivery ordersGood for quick checks when you already have MongoDB elsewhere.

- ✅ Claim and deliver orders

- 💰 Track earnings1) Ensure .env has your values or pass env vars at run time.

- 📱 Real-time delivery updates2) Build the image:

	- docker build -t vitatoo .

### 🆕 Admin Panel (Enterprise Features)3) Run the container (replace MONGO_URI if needed):

- 📋 **Vendor Applications**: Review and approve vendor registrations	- docker run -p 3000:3000 -e MONGO_URI="mongodb://host.docker.internal:27017/vitatoo" -e JWT_SECRET="change-me" vitatoo

- 🏢 **Vendor Management**: Activate/deactivate vendors

- 📊 **Analytics Dashboard**: Orders, revenue, and trends with Chart.js visualizationsOpen http://localhost:3000

- 🗄️ **Database Browser**: View and export all collections (JSON)

- 🔔 **Real-time Notifications**: Instant alerts for new applications and orders## Run with Docker Compose (app + Mongo)

- 🔐 **Secure Access**: Protected admin-only authentication systemThis is the simplest way for beginners—Compose spins up Mongo and the app together.

- 📈 **Business Insights**: Top vendors, popular items, revenue tracking

1) Edit docker-compose.yml env values if needed.

---2) Start both services:

	- docker compose up --build

## 🏗️ Tech Stack3) Stop:

	- docker compose down

| Layer | Technology |

|-------|-----------|App runs on http://localhost:3000, Mongo on mongodb://localhost:27017

| **Backend** | Node.js, Express.js |

| **Database** | MongoDB Atlas (Cloud) |## Environment variables

| **Real-time** | Socket.IO |- PORT: Web server port (default 3000)

| **Authentication** | JWT, bcrypt |- MONGO_URI: Mongo connection string

| **Frontend** | HTML5, Tailwind CSS, Vanilla JavaScript |- JWT_SECRET: Token secret

| **Charts** | Chart.js |- RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET: Only required if testing real payments

| **Payments** | Razorpay |- CLIENT_ORIGIN: CORS origin if you serve frontend elsewhere (optional)

| **Deployment** | Docker, Docker Compose |

## Common FAQs

---- CSS looks broken? Run "npm run build:css". In Docker, the build step already does this.

- Payments failing locally? Use test keys and configure Razorpay webhooks to your public URL (e.g., via ngrok). Not required for basic browsing.

## 🚀 Quick Start- Can I develop with hot-reload? Yes: npm run dev (requires local Node, not Docker runtime).



### Prerequisites## Scripts

- **Node.js** 20+ ([Download](https://nodejs.org/))- npm run build:css → builds Tailwind into public/css/tailwind.css

- **MongoDB Atlas** account ([Sign up](https://www.mongodb.com/cloud/atlas)) or local MongoDB- npm run seed → seeds demo data into Mongo

- **Git** installed- npm start → starts Express server



### 1️⃣ Clone Repository## Project structure (important bits)

```bash- server.js → Express app setup + Socket.io

git clone https://github.com/bishal692002/vitatoo.git- src/ → models, routes, sockets

cd vitatoo- public/ → HTML, JS, CSS (static frontend)

```

Enjoy hacking! If you get stuck, check terminal logs first—they usually tell you what’s missing.

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
# Required variables:
# - MONGO_URI=mongodb+srv://...
# - JWT_SECRET=your_secret_key
# - ADMIN_USER=admin
# - ADMIN_PASS=admin123
# - RAZORPAY_KEY_ID=rzp_test_... (optional)
# - RAZORPAY_KEY_SECRET=... (optional)
```

> ⚠️ **Security**: Never commit `.env` file to git! Change default admin credentials before production.

### 4️⃣ Build Tailwind CSS
```bash
npm run build:css
```

### 5️⃣ Seed Sample Data (Optional)
```bash
  
```

### 6️⃣ Start Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 7️⃣ Access Application
Open your browser and visit:

| Page | URL | Description |
|------|-----|-------------|
| **Homepage** | http://localhost:3000 | Main landing page |
| **Admin Login** | http://localhost:3000/vitato/admin-login.html | Admin panel access |
| **Vendor Application** | http://localhost:3000/vendor-application.html | Apply as vendor |
| **Student Dashboard** | http://localhost:3000/student.html | Student orders |
| **Vendor Dashboard** | http://localhost:3000/vendor.html | Vendor management |
| **Rider Dashboard** | http://localhost:3000/rider.html | Delivery management |

---

## 🔐 Admin Panel

### Default Login Credentials
```
Username: admin
Password: admin123
```

⚠️ **IMPORTANT**: Change these in `.env` file before production!

### Admin Dashboard Features

#### 📋 Tab 1: Vendor Applications
- View all pending vendor applications
- See complete business details
- **Approve**: Auto-generates secure vendor credentials
- **Reject**: Add reason for rejection
- Real-time notification badges

#### 🏢 Tab 2: Vendor Management
- List all approved vendors
- View vendor details (name, email, phone, categories)
- **Toggle Status**: Activate or deactivate vendors
- Track active vs inactive vendors

#### 📊 Tab 3: Orders & Analytics
- **6 Stats Cards**: Orders, Revenue, Vendors, Active Vendors, Users, Pending Applications
- **Orders Timeline**: Line chart with day/week/month filters
- **Top Vendors**: Bar chart showing top 10 by revenue
- **Popular Items**: Ranked list of best-selling items

#### 🗄️ Tab 4: Database Browser
- Browse 5 collections: users, vendors, orders, fooditems, applications
- View raw JSON data with pagination
- **Export**: Download collections as JSON files

---

## 🐳 Docker Deployment

### Option 1: Docker (Single Container)
```bash
# Build image
docker build -t vitatoo .

# Run container
docker run -p 3000:3000 \
  -e MONGO_URI="your_mongodb_uri" \
  -e JWT_SECRET="your_secret" \
  -e ADMIN_USER="admin" \
  -e ADMIN_PASS="admin123" \
  vitatoo
```

### Option 2: Docker Compose (App + MongoDB)
```bash
# Start all services
docker compose up --build

# Stop services
docker compose down

# View logs
docker compose logs -f
```

---

## 📁 Project Structure

```
vitatoo/
├── src/
│   ├── models/           # Mongoose models
│   │   ├── User.js
│   │   ├── Vendor.js
│   │   ├── Order.js
│   │   ├── FoodItem.js
│   │   └── VendorApplication.js  # NEW
│   ├── routes/           # API routes
│   │   ├── api.js
│   │   ├── payment.js
│   │   ├── admin.js              # NEW
│   │   └── vendorApplication.js  # NEW
│   ├── middleware/       # Auth & validation
│   │   ├── auth.js
│   │   ├── adminAuth.js          # NEW
│   │   └── geoFence.js
│   ├── sockets/          # Socket.IO handlers
│   │   └── orderSocket.js
│   └── config/           # Configuration
│       └── passport.js
├── public/               # Frontend files
│   ├── index.html
│   ├── student.html
│   ├── vendor.html
│   ├── rider.html
│   ├── vendor-application.html   # NEW
│   ├── vitato/                   # NEW
│   │   ├── admin-login.html
│   │   └── admin-dashboard.html
│   ├── js/
│   │   ├── student.js
│   │   ├── vendor.js
│   │   ├── rider.js
│   │   └── admin-dashboard.js    # NEW
│   └── css/
│       └── tailwind.css
  
├── server.js             # Express app entry
├── package.json
├── .env.example          # Environment template
└── .gitignore

Documentation (5 files):
├── ADMIN_FEATURES.md           # Complete admin docs (400+ lines)
├── QUICK_START.md              # Step-by-step testing guide
├── ARCHITECTURE.md             # System architecture
├── DEPLOYMENT_CHECKLIST.md     # Production deployment
└── GIT_WORKFLOW.md             # Git best practices
```

---

## 📊 Database Collections

### Existing Collections
- **users**: Students, riders, vendors, admins
- **vendors**: Approved vendor businesses
- **fooditems**: Menu items from vendors
- **orders**: Customer orders with tracking

### 🆕 New Collection
- **vendorApplications**: Pending/approved/rejected vendor applications
  ```javascript
  {
    applicationNumber: "VITVENDOR20250001",
    businessName: "Tasty Cafe",
    ownerName: "John Doe",
    contactNumber: "9876543210",
    email: "john@example.com",
    address: "VIT Bhopal Campus",
    cuisineType: "Multi-Cuisine",
    status: "pending", // pending | approved | rejected
    submittedAt: Date,
    reviewedAt: Date,
    rejectionReason: String
  }
  ```

---

## 🔒 Security Features

- ✅ **Multi-tier Authentication**: Public → Student/Rider → Vendor → Admin
- ✅ **JWT Tokens**: Stateless authentication for users
- ✅ **Admin Sessions**: Token-based with 8-hour expiration
- ✅ **Password Hashing**: bcrypt with salt rounds
- ✅ **Role-Based Access**: Middleware enforces permissions
- ✅ **No Public Vendor Signup**: Admin approval required
- ✅ **Environment Variables**: Secrets stored in `.env`
- ✅ **Input Validation**: All forms validated
- ✅ **CORS Protection**: Configurable origins

---

## 🧪 Testing

### Manual Testing
Follow the comprehensive testing guide in [QUICK_START.md](QUICK_START.md)

### Test Vendor Application Flow
1. Visit http://localhost:3000
2. Click "Apply as Vendor"
3. Fill form and submit
4. Note application number (e.g., `VITVENDOR20250001`)
5. Login as admin
6. Approve application in dashboard
7. Use generated credentials to login as vendor

---

## 📜 Available Scripts

```bash
# Development
npm run dev              # Start with nodemon (auto-reload)

# Production
npm start               # Start server

# Build
npm run build:css       # Build Tailwind CSS

# Database
# Use the Admin page to manage vendors, items, and users (no seed scripts required)
```

---

## 🌍 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `MONGO_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `ADMIN_USER` | Admin username | Yes | admin |
| `ADMIN_PASS` | Admin password | Yes | admin123 |
| `RAZORPAY_KEY_ID` | Razorpay API key | No | - |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | No | - |
| `ENFORCE_GEOFENCE` | Campus IP restriction | No | false |

---

## 📚 Documentation

Comprehensive documentation available in the repository:

| Document | Description | Lines |
|----------|-------------|-------|
| [ADMIN_FEATURES.md](ADMIN_FEATURES.md) | Complete admin feature guide | 400+ |
| [QUICK_START.md](QUICK_START.md) | Step-by-step testing guide | 300+ |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture diagrams | 200+ |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Production deployment | 250+ |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Git best practices | 200+ |

---

## 🚀 Deployment

### Production Checklist
- [ ] Change default admin credentials in `.env`
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Set up MongoDB Atlas with IP whitelist
- [ ] Configure Razorpay with live keys
- [ ] Enable HTTPS/SSL
- [ ] Set up proper CORS origins
- [ ] Configure environment variables on hosting platform
- [ ] Set up monitoring and logging
- [ ] Test all features in staging environment

### Recommended Hosting Platforms
- **Backend**: Heroku, Railway, Render, AWS EC2, DigitalOcean
- **Database**: MongoDB Atlas (already configured)
- **CDN**: Cloudflare (for static assets)

---

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

**MongoDB connection failed:**
- Check `MONGO_URI` in `.env`
- Verify network access in MongoDB Atlas
- Ensure database cluster is running

**Admin can't login:**
- Verify `ADMIN_USER` and `ADMIN_PASS` in `.env`
- Check browser console for errors
- Clear localStorage and retry

**Charts not rendering:**
- Ensure Chart.js CDN is accessible
- Check analytics API returns data
- Verify browser console for errors

**Real-time notifications not working:**
- Check Socket.IO initializes in server logs
- Verify browser console shows Socket.IO connection
- Ensure port 3000 is accessible

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Bishal** - [@bishal692002](https://github.com/bishal692002)

---

## 🙏 Acknowledgments

- VIT Bhopal for the inspiration
- Tailwind CSS for the beautiful UI framework
- Socket.IO for real-time capabilities
- Chart.js for analytics visualizations
- MongoDB Atlas for reliable cloud database
- Razorpay for payment integration

---

## 📞 Support

For questions, issues, or feature requests:
- Open an [Issue](https://github.com/bishal692002/vitatoo/issues)
- Check [Documentation](./ADMIN_FEATURES.md)
- Review [Quick Start Guide](./QUICK_START.md)

---

## 🎉 What's New in Latest Version

### v2.0.0 - Admin Panel Release
- ✨ Complete admin dashboard with 4 tabs
- 📋 Vendor application and approval system
- 📊 Analytics with Chart.js visualizations
- 🗄️ Database browser with JSON export
- 🔔 Real-time Socket.IO notifications
- 🔐 Multi-tier security architecture
- 📚 1,500+ lines of comprehensive documentation
- ✅ Zero breaking changes to existing features

---

<div align="center">

**Made with ❤️ for VIT Bhopal students**

⭐ Star this repo if you find it helpful!

[Report Bug](https://github.com/bishal692002/vitatoo/issues) · [Request Feature](https://github.com/bishal692002/vitatoo/issues) · [Documentation](./ADMIN_FEATURES.md)

</div>
>>>>>>> c068d1e (Changed some issues)
