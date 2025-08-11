import { Router } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import FoodItem from '../models/FoodItem.js';
import Order from '../models/Order.js';
import { ensureAuth } from '../middleware/auth.js';

const router = Router();

function getInstance(){
  if(!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET){
    throw new Error('Razorpay keys missing');
  }
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

// Frontend can fetch key id to initialize Razorpay
router.get('/config', (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID || null });
});

// Create an order (expects items: [{foodId, quantity}])
router.post('/create-order', ensureAuth, async (req, res) => {
  try {
    const { items } = req.body;
    if(!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });
    const foodDocs = await FoodItem.find({ _id: { $in: items.map(i=>i.foodId) } });
    if(!foodDocs.length) return res.status(400).json({ error: 'Invalid items' });
    const orderItems = items.map(i=> {
      const f = foodDocs.find(fd=> fd.id === i.foodId);
      if(!f) throw new Error('Item not found');
      return { food: f._id, quantity: i.quantity, price: f.price };
    });
    const subtotal = orderItems.reduce((s,i)=> s + i.price * i.quantity, 0);
    const deliveryFee = subtotal < 200 ? 15 : 10;
    const total = subtotal + deliveryFee;

    const instance = getInstance();
    const rzpOrder = await instance.orders.create({
      amount: total * 100, // in paise
      currency: 'INR',
      receipt: 'rcpt_'+Date.now(),
      notes: { userId: req.user.id.toString() }
    });

    const order = await Order.create({ user: req.user.id, items: orderItems, total, deliveryFee, payment: { razorpayOrderId: rzpOrder.id, status: 'pending' } });
    req.app.get('io').to(req.user.id.toString()).emit('order_created', { orderId: order._id });
    res.json({ orderId: order._id, razorpayOrderId: rzpOrder.id, amount: total * 100, currency: 'INR' });
  } catch (e) {
    res.status(500).json({ error: 'Payment order failed' });
  }
});

// Verification callback (POST from frontend after payment) - not webhook (webhook could be added later)
router.post('/verify', ensureAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    if(!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) return res.status(400).json({ error: 'Missing fields' });
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if(expectedSignature !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
    const order = await Order.findById(orderId);
    if(!order) return res.status(404).json({ error: 'Order not found' });
    if(order.payment.razorpayOrderId !== razorpay_order_id) return res.status(400).json({ error: 'Order mismatch' });
    order.payment.status = 'paid';
    order.payment.razorpayPaymentId = razorpay_payment_id;
    order.payment.razorpaySignature = razorpay_signature;
    await order.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
