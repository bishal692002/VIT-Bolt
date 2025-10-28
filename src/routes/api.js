import { Router } from 'express';
import FoodItem from '../models/FoodItem.js';
import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';
import { ensureAuth, requireRole } from '../middleware/auth.js';
import ensureVendorContext from '../middleware/vendorContext.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Helper: fetch remote image and save to public/uploads, return local path or original URL on failure
async function fetchAndSaveImage(url){
  try{
    if(!/^https?:\/\//i.test(url)) return url;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Failed to fetch image');
    const ct = res.headers.get('content-type') || '';
    if(!ct.startsWith('image/')) throw new Error('URL did not return an image content-type');
    const ext = (ct.split('/')[1] || 'jpg').split(';')[0].split('+')[0];
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return '/uploads/' + fileName;
  } catch (e) {
    console.warn('fetchAndSaveImage failed for', url, e.message);
    return url; // fallback to original URL (may still fail to render)
  }
}

router.get('/menu', async (req, res) => {
  try {
    const { q, category } = req.query;
    const filter = {};
    if (q) filter.name = { $regex: q, $options: 'i' };
    if (category) filter.category = category;
    
    const items = await FoodItem.find(filter).populate('vendor');
    
    // Add vendor online status to each item
    const itemsWithStatus = items.map(item => ({
      ...item.toObject(),
      vendorOnline: item.vendor ? item.vendor.isOnline !== false : true // Default to true if not set
    }));
    
    res.json(itemsWithStatus);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Direct order creation disabled in prepaid flow; use /api/payments/create-order
router.post('/orders', ensureAuth, (req, res) => {
  return res.status(410).json({ error: 'Deprecated endpoint. Use /api/payments/create-order.' });
});

router.get('/orders/:id', ensureAuth, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('items.food')
    .populate('deliveryPartner')
    .populate('user', 'name phone email');
  if (!order) return res.status(404).json({ error: 'Not found' });
  
  // Allow access to: the customer who placed it, vendors whose items are in the order, or delivery partner
  const isCustomer = order.user._id.toString() === req.user.id.toString();
  const isDeliveryPartner = order.deliveryPartner && order.deliveryPartner._id.toString() === req.user.id.toString();
  
  let isVendor = false;
  if (req.user.role === 'vendor') {
    let vendorId = req.user.vendor || null;
    if (!vendorId) {
      try {
        const byUser = await Vendor.findOne({ user: req.user.id });
        if (byUser) vendorId = byUser._id;
      } catch {}
      if (!vendorId && req.user.email) {
        try {
          const byEmail = await Vendor.findOne({ contactEmail: req.user.email.toLowerCase() });
          if (byEmail) vendorId = byEmail._id;
        } catch {}
      }
    }
    if (vendorId) {
      const vendorFoodIds = await FoodItem.find({ vendor: vendorId }).distinct('_id');
      isVendor = order.items.some(item => vendorFoodIds.some(id => id.toString() === item.food._id.toString()));
    }
  }
  
  if (!isCustomer && !isVendor && !isDeliveryPartner) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json(order);
});

// Prototype only: update order status manually (would require proper role in production)
router.post('/orders/:id/status', ensureAuth, async (req, res) => {
  const { status } = req.body;
  if(!['preparing','out_for_delivery','delivered'].includes(status)) return res.status(400).json({ error: 'Bad status'});
  const order = await Order.findById(req.params.id);
  if(!order) return res.status(404).json({ error: 'Not found' });
  // Allow owner or placeholder admin override
  if (order.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden'});
  order.status = status;
  await order.save();
  const io = req.app.get('io');
  io.to(`order_${order._id}`).emit('order_status', { orderId: order._id.toString(), status });
  io.to(order.user.toString()).emit('order_status', { orderId: order._id.toString(), status });
  io.emit('orders_updated');
  res.json({ ok: true, status });
});

router.get('/vendors', async (req, res) => {
  const vendors = await Vendor.find();
  res.json(vendors);
});

// Return distinct categories from FoodItem
router.get('/categories', async (req, res) => {
  const cats = await FoodItem.distinct('category', { category: { $exists: true, $ne: '' } });
  res.json(cats.sort());
});

// Vendor CRUD & data (vendor role, securely scoped)
// Helper to resolve vendor id from token, or via linked user/email
async function resolveVendorId(user){
  // 1) If token has vendor id, use it
  if (user?.vendor) return user.vendor;
  // 2) Try finding a vendor linked to the user (legacy pattern; schema may not have this)
  try {
    const vByUser = await Vendor.findOne({ user: user.id });
    if (vByUser) return vByUser._id;
  } catch {}
  // 3) Fallback by vendor contactEmail matching the user's email
  try {
    if (user?.email){
      const vByEmail = await Vendor.findOne({ contactEmail: user.email.toLowerCase() });
      if (vByEmail) return vByEmail._id;
    }
  } catch {}
  return null;
}

router.get('/vendor/items', ensureAuth, requireRole('vendor'), ensureVendorContext, async (req, res) => {
  const vendorId = req.vendorId;
  if(!vendorId) return res.status(403).json({ error: 'Vendor not found' });
  const items = await FoodItem.find({ vendor: vendorId }).sort({ createdAt: -1 });
  res.json(items);
});
router.post('/vendor/items', ensureAuth, requireRole('vendor'), ensureVendorContext, async (req, res) => {
  const vendorId = req.vendorId;
  if(!vendorId) return res.status(403).json({ error: 'Vendor not found' });
  const { name, price, category, image, inStock } = req.body;
  const finalImage = image ? await fetchAndSaveImage(image) : '';
  const item = await FoodItem.create({ name, price, category, image: finalImage, inStock, vendor: vendorId });
  req.app.get('io').emit('menu_updated');
  res.json(item);
});
router.put('/vendor/items/:id', ensureAuth, requireRole('vendor'), ensureVendorContext, async (req, res) => {
  const vendorId = req.vendorId;
  if(!vendorId) return res.status(403).json({ error: 'Vendor not found' });
  const update = { ...req.body };
  if(update.image) update.image = await fetchAndSaveImage(update.image);
  const item = await FoodItem.findOneAndUpdate({ _id: req.params.id, vendor: vendorId }, update, { new: true });
  if (!item) return res.status(404).json({ error: 'Not found' });
  req.app.get('io').emit('menu_updated');
  res.json(item);
});
router.delete('/vendor/items/:id', ensureAuth, requireRole('vendor'), ensureVendorContext, async (req, res) => {
  const vendorId = req.vendorId;
  if(!vendorId) return res.status(403).json({ error: 'Vendor not found' });
  const del = await FoodItem.deleteOne({ _id: req.params.id, vendor: vendorId });
  if(!del.deletedCount) return res.status(404).json({ error: 'Not found' });
  req.app.get('io').emit('menu_updated');
  res.json({ ok: true });
});

// Vendor orders (orders that include at least one of this vendor's items)
router.get('/vendor/orders', ensureAuth, requireRole('vendor'), ensureVendorContext, async (req, res) => {
  const vendorId = req.vendorId;
  if(!vendorId) return res.status(403).json({ error: 'Vendor not found' });
  const vendorFoodIds = await FoodItem.find({ vendor: vendorId }).distinct('_id');
  if(!vendorFoodIds.length) return res.json([]);
  // Exclude failed payments older than 3 minutes (show briefly, then auto-disappear)
  const cutoff = new Date(Date.now() - 3 * 60 * 1000);
  const orders = await Order.find({
      'items.food': { $in: vendorFoodIds },
      status: { $ne: 'cancelled' },
      $or: [
        { 'payment.status': { $ne: 'failed' } },
        { $and: [ { 'payment.status': 'failed' }, { updatedAt: { $gte: cutoff } } ] }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate({ path: 'items.food', select: 'name price vendor', populate: { path: 'vendor', select: 'name' } })
    .populate({ path: 'user', select: 'name phone' })
    .populate({ path: 'deliveryPartner', select: 'name phone' });
  if (process.env.VENDOR_DEBUG === '1') {
    console.log('[GET /api/vendor/orders] vendorId=', vendorId.toString(), 'orders=', orders.length);
  }
  res.json(orders);
});

// Vendor can update order status (placed -> cooking -> ready)
router.post('/vendor/orders/:id/status', ensureAuth, requireRole('vendor'), ensureVendorContext, async (req, res) => {
  const { status } = req.body;
  if(!['cooking','ready'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const vendorId = req.vendorId;
  if(!vendorId) return res.status(403).json({ error: 'Vendor not found' });
  // Fetch order & ensure it includes vendor's food items
  const order = await Order.findById(req.params.id);
  if(!order) return res.status(404).json({ error: 'Not found' });
  const vendorFoodIds = await FoodItem.find({ vendor: vendorId }).distinct('_id');
  const containsVendorItem = order.items.some(i => vendorFoodIds.find(id => id.toString() === i.food.toString()));
  if(!containsVendorItem) return res.status(403).json({ error: 'Forbidden' });
  // Require payment before progressing beyond placed
  if(order.payment && order.payment.status !== 'paid') return res.status(409).json({ error: 'Payment pending' });
  // Progression rules
  if(status === 'cooking' && order.status !== 'placed') return res.status(409).json({ error: 'Cannot move to cooking' });
  if(status === 'ready' && order.status !== 'cooking') return res.status(409).json({ error: 'Cannot move to ready' });
  order.status = status;
  await order.save();
  const io = req.app.get('io');
  io.emit('orders_updated');
  io.to(`vendor_${vendorId.toString()}`).emit('orders_updated');
  io.to(`order_${order._id}`).emit('order_status', { orderId: order._id.toString(), status: order.status });
  io.to(order.user.toString()).emit('order_status', { orderId: order._id.toString(), status: order.status });
  if (process.env.VENDOR_DEBUG === '1') {
    console.log('[POST /api/vendor/orders/:id/status]', { orderId: order._id.toString(), vendorId: vendorId.toString(), status });
  }
  res.json({ ok: true, status: order.status });
});

// Diagnostics: resolved vendor info
router.get('/vendor/me', ensureAuth, requireRole('vendor'), ensureVendorContext, (req, res) => {
  res.json({ vendorId: req.vendorId?.toString(), email: req.user.email, vendor: req.vendor });
});

// Order history for student
router.get('/orders', ensureAuth, async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(25)
    .populate({
      path: 'items.food',
      select: 'name price image vendor',
      populate: { path: 'vendor', select: 'name address image' }
    });
  res.json(orders);
});

// Rider endpoints
router.get('/rider/orders/available', ensureAuth, requireRole('delivery'), async (req, res) => {
  const orders = await Order.find({ status: 'ready', deliveryPartner: { $exists: false }, declinedRiders: { $ne: req.user.id } }).sort({ createdAt: 1 }).limit(30);
  res.json(orders);
});
router.post('/rider/orders/:id/claim', ensureAuth, requireRole('delivery'), async (req, res) => {
  const order = await Order.findOneAndUpdate({ _id: req.params.id, deliveryPartner: { $exists: false } }, { deliveryPartner: req.user.id, status: 'out_for_delivery' }, { new: true });
  if(!order) return res.status(404).json({ error: 'Unavailable' });
  const io = req.app.get('io');
  io.emit('orders_updated');
  io.emit('order_claimed', { orderId: order._id.toString(), riderId: req.user.id });
  io.to(order.user.toString()).emit('order_status', { orderId: order._id.toString(), status: order.status });
  io.to(`order_${order._id.toString()}`).emit('order_status', { orderId: order._id.toString(), status: order.status });
  res.json(order);
});
router.post('/rider/orders/:id/delivered', ensureAuth, requireRole('delivery'), async (req, res) => {
  const order = await Order.findOneAndUpdate({ _id: req.params.id, deliveryPartner: req.user.id }, { status: 'delivered' }, { new: true });
  if(!order) return res.status(404).json({ error: 'Not found' });
  const io = req.app.get('io');
  io.emit('orders_updated');
  io.to(order.user.toString()).emit('order_status', { orderId: order._id.toString(), status: order.status });
  io.to(`order_${order._id.toString()}`).emit('order_status', { orderId: order._id.toString(), status: order.status });
  res.json(order);
});

// Rider decline endpoint: adds rider to declinedRiders so they no longer see it
router.post('/rider/orders/:id/decline', ensureAuth, requireRole('delivery'), async (req, res) => {
  const order = await Order.findOneAndUpdate({ _id: req.params.id, deliveryPartner: { $exists: false } }, { $addToSet: { declinedRiders: req.user.id } }, { new: true });
  if(!order) return res.status(404).json({ error: 'Not found or already assigned' });
  res.json({ ok: true });
});

// ---------------- Address Management (Student) ----------------
router.get('/addresses', ensureAuth, async (req, res) => {
  // Return addresses for current user
  const user = req.user; // populated from token (no DB fetch yet)
  const dbUser = await (await import('../models/User.js')).default.findById(user.id, 'addresses');
  res.json(dbUser?.addresses || []);
});
router.post('/addresses', ensureAuth, async (req, res) => {
  const { label, line1, line2, landmark } = req.body;
  if(!line1) return res.status(400).json({ error: 'line1 required' });
  const UserModel = (await import('../models/User.js')).default;
  const user = await UserModel.findById(req.user.id);
  user.addresses.push({ label, line1, line2, landmark });
  await user.save();
  res.json(user.addresses[user.addresses.length-1]);
});
router.put('/addresses/:id', ensureAuth, async (req, res) => {
  const { label, line1, line2, landmark } = req.body;
  const UserModel = (await import('../models/User.js')).default;
  const user = await UserModel.findById(req.user.id);
  const addr = user.addresses.id(req.params.id);
  if(!addr) return res.status(404).json({ error: 'Not found' });
  if(line1) addr.line1 = line1;
  if(label !== undefined) addr.label = label;
  addr.line2 = line2 || '';
  addr.landmark = landmark || '';
  await user.save();
  res.json(addr);
});
router.delete('/addresses/:id', ensureAuth, async (req, res) => {
  const UserModel = (await import('../models/User.js')).default;
  const user = await UserModel.findById(req.user.id);
  const addr = user.addresses.id(req.params.id);
  if(!addr) return res.status(404).json({ error: 'Not found' });
  addr.deleteOne();
  await user.save();
  res.json({ ok: true });
});

// Rider assigned (active) orders
router.get('/rider/orders/assigned', ensureAuth, requireRole('delivery'), async (req, res) => {
  const orders = await Order.find({ deliveryPartner: req.user.id, status: { $ne: 'delivered' } })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate({ path: 'items.food', select: 'name price vendor', populate: { path: 'vendor', select: 'name' } })
    .populate({ path: 'user', select: 'name phone' });
  res.json(orders);
});
// Rider delivered history
router.get('/rider/orders/history', ensureAuth, requireRole('delivery'), async (req, res) => {
  const orders = await Order.find({ deliveryPartner: req.user.id, status: 'delivered' })
    .sort({ updatedAt: -1 })
    .limit(50)
    .populate({ path: 'items.food', select: 'name price vendor', populate: { path: 'vendor', select: 'name' } })
    .populate({ path: 'user', select: 'name phone' });
  res.json(orders);
});

// Unified order detail endpoint for student(owner) / vendor (if contains vendor item) / rider (if assigned)
router.get('/order/:id', ensureAuth, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate({ path: 'items.food', select: 'name price vendor', populate: { path: 'vendor', select: 'name' } })
    .populate({ path: 'user', select: 'name phone' })
    .populate({ path: 'deliveryPartner', select: 'name phone' });
  if(!order) return res.status(404).json({ error: 'Not found' });
  const userId = req.user.id.toString();
  let allowed = false;
  if(order.user.toString() === userId) allowed = true; // student owner
  if(!allowed && req.user.role === 'delivery' && order.deliveryPartner && order.deliveryPartner._id.toString() === userId) allowed = true;
  if(!allowed && req.user.role === 'vendor' && req.user.vendor){
    const vendorFoodIds = await FoodItem.find({ vendor: req.user.vendor }).distinct('_id');
    allowed = order.items.some(i => vendorFoodIds.find(id => id.toString() === i.food._id.toString()));
  }
  if(!allowed) return res.status(403).json({ error: 'Forbidden' });
  res.json(order);
});

// Auth/me helper (JWT based: provide user info from token if valid)
router.get('/me', ensureAuth, (req, res) => {
  const { id, name, email, role, vendor } = req.user;
  const payload = { id, name, email, role };
  if(vendor) payload.vendor = vendor;
  res.json(payload);
});

export default router;
