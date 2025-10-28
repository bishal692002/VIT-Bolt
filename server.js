import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from './src/models/User.js';
import apiRouter from './src/routes/api.js';
import paymentRouter from './src/routes/payment.js';
import adminRouter from './src/routes/admin.js';
import vendorApplicationRouter from './src/routes/vendorApplication.js';
import vendorRouter from './src/routes/vendor.js';
import { adminLogin, adminLogout } from './src/middleware/adminAuth.js';
import orderSocket from './src/sockets/orderSocket.js';
import { createServer } from 'http';
import { geoFenceMiddleware } from './src/middleware/geoFence.js';
import Vendor from './src/models/Vendor.js';
import Order from './src/models/Order.js';

dotenv.config();
const app = express();
const httpServer = createServer(app);
// Initialize socket.io and attach reference to express app for route usage
const io = orderSocket(httpServer);
app.set('io', io);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vitato');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom admin login route (hidden behind a clean path)
app.get('/admin-login', (req, res) => {
  try {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    return res.sendFile(path.join(__dirname, 'public', 'vitato', 'admin-login.html'));
  } catch (e) {
    return res.status(500).send('Admin login unavailable');
  }
});

// Clean admin dashboard route
app.get('/admin', (req, res) => {
  try {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    return res.sendFile(path.join(__dirname, 'public', 'vitato', 'admin-dashboard.html'));
  } catch (e) {
    return res.status(500).send('Admin dashboard unavailable');
  }
});

// Optionally block direct access to the static file path
app.get('/vitato/admin-login.html', (req, res) => {
  return res.status(404).send('Not Found');
});

// Redirect old dashboard path to clean /admin for consistency
app.get('/vitato/admin-dashboard.html', (req, res) => {
  return res.redirect(302, '/admin');
});

app.use(express.static(path.join(__dirname, 'public')));

// No session/passport; using stateless JWT

// Geo-fence (basic IP check placeholder)
app.use('/api/orders', geoFenceMiddleware);

app.use('/api', apiRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/vendor-applications', vendorApplicationRouter);
app.use('/api/vendor', vendorRouter);
app.use('/vitato/admin-api', adminRouter);

// Admin authentication routes
app.post('/vitato/admin-login', adminLogin);
app.post('/vitato/admin-logout', adminLogout);
// Clean aliases for admin auth
app.post('/admin-login', adminLogin);
app.post('/admin-logout', adminLogout);

// Local Auth Routes (JWT)
app.post('/auth/signup', async (req, res) => {
  try {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  let finalRole = 'student';
  if (role === 'delivery') finalRole = 'delivery';
  if (role === 'vendor') return res.status(400).json({ error: 'Vendor registration not allowed' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email in use' });
    const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: finalRole });
  const payload = { id: user._id, email: user.email, name: user.name, role: user.role };
  if(user.vendor) payload.vendor = user.vendor;
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev_jwt', { expiresIn: '7d' });
  res.json({ token, user: payload, redirect: role === 'delivery' ? '/rider.html' : '/student.html' });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  // Auto-link vendor accounts to Vendor collection if missing, so JWT carries vendor id
  if (user.role === 'vendor' && !user.vendor) {
    try {
      let vendorDoc = await Vendor.findOne({ contactEmail: user.email.toLowerCase() });
      if (!vendorDoc && user.name) {
        const regex = new RegExp(`^${escapeRegExp(user.name.trim())}$`, 'i');
        vendorDoc = await Vendor.findOne({ name: regex });
      }
      if (!vendorDoc && user.name) {
        const regex = new RegExp(`^${escapeRegExp(user.name.trim())}$`, 'i');
        vendorDoc = await Vendor.findOne({ ownerName: regex });
      }
      if (vendorDoc) {
        user.vendor = vendorDoc._id;
        await user.save();
        console.log('Linked vendor user', user.email, 'to vendor', vendorDoc._id.toString());
      } else {
        console.warn('Vendor login without linked vendor record for', user.email);
      }
    } catch (e) {
      console.warn('Vendor auto-link failed for', user.email, e && (e.message || e));
    }
  }
  const payload = { id: user._id, email: user.email, name: user.name, role: user.role };
  if(user.vendor) payload.vendor = user.vendor;
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev_jwt', { expiresIn: '7d' });
  let redirect = '/student.html';
  if (user.role === 'delivery') redirect = '/rider.html';
  if (user.role === 'vendor') redirect = '/vendor.html';
  res.json({ token, user: payload, redirect });
});
// Logout on client = discard token; server endpoint optional for blacklist (not implemented)
app.post('/auth/logout', (req, res) => { res.json({ ok: true }); });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT,"0.0.0.0", () => console.log(`VIT-Bolt server running on port ${PORT}`));

// ---------------- Background Jobs: Auto-cancel & Cleanup ----------------
// Auto-cancel orders that remain 'placed' beyond a threshold
const AUTOCANCEL_MINUTES = Number(process.env.AUTOCANCEL_MINUTES || 20);
const FAULTY_CLEANUP_HOURS = Number(process.env.FAULTY_CLEANUP_HOURS || 24);

async function emitVendorUpdatesForOrder(io, order) {
  try {
    // Populate vendors from items
    await order.populate({ path: 'items.food', populate: { path: 'vendor', select: '_id' } });
    const vendorIds = Array.from(new Set(order.items.map(i => i.food?.vendor?._id?.toString()).filter(Boolean)));
    if (vendorIds.length) {
      vendorIds.forEach(vId => io.to(`vendor_${vId}`).emit('orders_updated'));
    } else {
      io.emit('orders_updated');
    }
  } catch {
    io.emit('orders_updated');
  }
}

async function autoCancelPlacedOrders() {
  try {
    const threshold = new Date(Date.now() - AUTOCANCEL_MINUTES * 60 * 1000);
    // Candidates: still placed and older than threshold
    const candidates = await Order.find({ status: 'placed', createdAt: { $lt: threshold } }).limit(200);
    if (!candidates.length) return;
    const io = app.get('io');
    for (const o of candidates) {
      // Double-check current status to avoid races
      if (o.status !== 'placed') continue;
      o.status = 'cancelled';
      await o.save();
      // Notify student (user room) and any order-specific subscribers
      io.to(o.user.toString()).emit('order_status', { orderId: o._id.toString(), status: 'cancelled' });
      io.to(`order_${o._id.toString()}`).emit('order_status', { orderId: o._id.toString(), status: 'cancelled' });
      // Notify vendors to refresh
      await emitVendorUpdatesForOrder(io, o);
    }
  } catch (e) {
    console.warn('[autoCancelPlacedOrders] error:', e && (e.message || e));
  }
}

async function cleanupFaultyOrders() {
  try {
    const olderThan = new Date(Date.now() - FAULTY_CLEANUP_HOURS * 60 * 60 * 1000);
    // Faulty: stuck in 'placed' and very old, and not paid (or missing payment field)
    const filter = {
      status: 'placed',
      createdAt: { $lt: olderThan },
      $or: [
        { 'payment.status': { $exists: false } },
        { 'payment.status': { $ne: 'paid' } }
      ]
    };
    const { deletedCount } = await Order.deleteMany(filter);
    if (deletedCount) {
      const io = app.get('io');
      io.emit('orders_updated');
      console.log(`[cleanupFaultyOrders] Deleted ${deletedCount} old/inactive orders`);
    }
  } catch (e) {
    console.warn('[cleanupFaultyOrders] error:', e && (e.message || e));
  }
}

// Kick off jobs
setInterval(autoCancelPlacedOrders, 60 * 1000); // every minute
// Run initial sweep shortly after start
setTimeout(() => { autoCancelPlacedOrders(); cleanupFaultyOrders(); }, 5000);
