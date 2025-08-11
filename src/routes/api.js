import { Router } from 'express';
import FoodItem from '../models/FoodItem.js';
import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';
import { ensureAuth } from '../middleware/auth.js';

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
  req.app.get('io').to(req.user.id.toString()).emit('order_created', { orderId: order._id });
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
  req.app.get('io').to(`order_${order._id}`).emit('order_status', { orderId: order._id.toString(), status });
  req.app.get('io').to(order.user.toString()).emit('order_status', { orderId: order._id.toString(), status });
  res.json({ ok: true, status });
});

router.get('/vendors', async (req, res) => {
  const vendors = await Vendor.find();
  res.json(vendors);
});

// Auth/me helper (JWT based: provide user info from token if valid)
router.get('/me', ensureAuth, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role });
});

export default router;
