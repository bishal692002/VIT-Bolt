import { Router } from 'express';
import FoodItem from '../models/FoodItem.js';
import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';
import { ensureAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/menu', async (req, res) => {
  const { q, category } = req.query;
  const filter = {};
  if (q) filter.name = { $regex: q, $options: 'i' };
  if (category) filter.category = category;
  const items = await FoodItem.find(filter).populate('vendor');
  res.json(items);
});

router.post('/orders', ensureAuth, async (req, res) => {
  const { items } = req.body; // items: [{foodId, quantity}]
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });
  const foodDocs = await FoodItem.find({ _id: { $in: items.map(i => i.foodId) } });
  const orderItems = items.map(i => {
    const f = foodDocs.find(fd => fd.id === i.foodId);
    return { food: f._id, quantity: i.quantity, price: f.price };
  });
  const subtotal = orderItems.reduce((s,i)=> s + i.price * i.quantity, 0);
  const deliveryFee = subtotal < 200 ? 15 : 10; // simple rule
  const total = subtotal + deliveryFee;
  const order = await Order.create({ user: req.user.id, items: orderItems, total, deliveryFee });
  const io = req.app.get('io');
  io.to(req.user.id.toString()).emit('order_created', { orderId: order._id });
  io.emit('orders_updated');
  res.json(order);
});

router.get('/orders/:id', ensureAuth, async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.food').populate('deliveryPartner');
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.user.toString() !== req.user.id.toString()) return res.status(403).json({ error: 'Forbidden' });
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

// Vendor CRUD & data (vendor role, securely scoped)
router.get('/vendor/items', ensureAuth, requireRole('vendor'), async (req, res) => {
  if(!req.user.vendor) return res.status(400).json({ error: 'Vendor context missing' });
  const items = await FoodItem.find({ vendor: req.user.vendor }).sort({ createdAt: -1 });
  res.json(items);
});
router.post('/vendor/items', ensureAuth, requireRole('vendor'), async (req, res) => {
  if(!req.user.vendor) return res.status(400).json({ error: 'Vendor context missing' });
  const { name, price, category, image, inStock } = req.body;
  const item = await FoodItem.create({ name, price, category, image, inStock, vendor: req.user.vendor });
  req.app.get('io').emit('menu_updated');
  res.json(item);
});
router.put('/vendor/items/:id', ensureAuth, requireRole('vendor'), async (req, res) => {
  if(!req.user.vendor) return res.status(400).json({ error: 'Vendor context missing' });
  const item = await FoodItem.findOneAndUpdate({ _id: req.params.id, vendor: req.user.vendor }, req.body, { new: true });
  if (!item) return res.status(404).json({ error: 'Not found' });
  req.app.get('io').emit('menu_updated');
  res.json(item);
});
router.delete('/vendor/items/:id', ensureAuth, requireRole('vendor'), async (req, res) => {
  if(!req.user.vendor) return res.status(400).json({ error: 'Vendor context missing' });
  const del = await FoodItem.deleteOne({ _id: req.params.id, vendor: req.user.vendor });
  if(!del.deletedCount) return res.status(404).json({ error: 'Not found' });
  req.app.get('io').emit('menu_updated');
  res.json({ ok: true });
});

// Vendor orders (orders that include at least one of this vendor's items)
router.get('/vendor/orders', ensureAuth, requireRole('vendor'), async (req, res) => {
  if(!req.user.vendor) return res.status(400).json({ error: 'Vendor context missing' });
  const vendorFoodIds = await FoodItem.find({ vendor: req.user.vendor }).distinct('_id');
  if(!vendorFoodIds.length) return res.json([]);
  const orders = await Order.find({ 'items.food': { $in: vendorFoodIds } }).sort({ createdAt: -1 }).limit(50);
  res.json(orders);
});

// Vendor can update order status (placed -> cooking -> ready)
router.post('/vendor/orders/:id/status', ensureAuth, requireRole('vendor'), async (req, res) => {
  const { status } = req.body;
  if(!['cooking','ready'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if(!req.user.vendor) return res.status(400).json({ error: 'Vendor context missing' });
  // Fetch order & ensure it includes vendor's food items
  const order = await Order.findById(req.params.id);
  if(!order) return res.status(404).json({ error: 'Not found' });
  const vendorFoodIds = await FoodItem.find({ vendor: req.user.vendor }).distinct('_id');
  const containsVendorItem = order.items.some(i => vendorFoodIds.find(id => id.toString() === i.food.toString()));
  if(!containsVendorItem) return res.status(403).json({ error: 'Forbidden' });
  // Progression rules
  if(status === 'cooking' && order.status !== 'placed') return res.status(409).json({ error: 'Cannot move to cooking' });
  if(status === 'ready' && order.status !== 'cooking') return res.status(409).json({ error: 'Cannot move to ready' });
  order.status = status;
  await order.save();
  const io = req.app.get('io');
  io.emit('orders_updated');
  io.to(`order_${order._id}`).emit('order_status', { orderId: order._id.toString(), status: order.status });
  io.to(order.user.toString()).emit('order_status', { orderId: order._id.toString(), status: order.status });
  res.json({ ok: true, status: order.status });
});

// Order history for student
router.get('/orders', ensureAuth, async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(25);
  res.json(orders);
});

// Rider endpoints
router.get('/rider/orders/available', ensureAuth, requireRole('delivery'), async (req, res) => {
  const orders = await Order.find({ status: { $in: ['ready','out_for_delivery'] }, deliveryPartner: { $exists: false } }).sort({ createdAt: 1 }).limit(30);
  res.json(orders);
});
router.post('/rider/orders/:id/claim', ensureAuth, requireRole('delivery'), async (req, res) => {
  const order = await Order.findOneAndUpdate({ _id: req.params.id, deliveryPartner: { $exists: false } }, { deliveryPartner: req.user.id, status: 'out_for_delivery' }, { new: true });
  if(!order) return res.status(404).json({ error: 'Unavailable' });
  const io = req.app.get('io');
  io.emit('orders_updated');
  io.to(order.user.toString()).emit('order_status', { orderId: order._id.toString(), status: order.status });
  res.json(order);
});
router.post('/rider/orders/:id/delivered', ensureAuth, requireRole('delivery'), async (req, res) => {
  const order = await Order.findOneAndUpdate({ _id: req.params.id, deliveryPartner: req.user.id }, { status: 'delivered' }, { new: true });
  if(!order) return res.status(404).json({ error: 'Not found' });
  const io = req.app.get('io');
  io.emit('orders_updated');
  io.to(order.user.toString()).emit('order_status', { orderId: order._id.toString(), status: order.status });
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
