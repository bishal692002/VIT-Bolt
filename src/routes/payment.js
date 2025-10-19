import express, { Router } from 'express';
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
  const { items, address } = req.body;
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

    // Choose address snapshot (if provided), else fallback to first user address (not implemented fetch here) or minimal placeholder
    let deliveryAddress = null;
    if(address && typeof address === 'object'){
      const { label, line1, line2, landmark } = address;
      deliveryAddress = { label, line1, line2, landmark };
    }
    const order = await Order.create({ user: req.user.id, items: orderItems, total, deliveryFee, deliveryAddress, payment: { razorpayOrderId: rzpOrder.id, status: 'pending' } });
    req.app.get('io').to(req.user.id.toString()).emit('order_created', { orderId: order._id });
    res.json({ orderId: order._id, razorpayOrderId: rzpOrder.id, amount: total * 100, currency: 'INR' });
  } catch (e) {
    console.error('Create-order error:', e && (e.message || e));
    const msg = process.env.NODE_ENV === 'production' ? 'Payment order failed' : (e.message || 'Payment order failed');
    res.status(500).json({ error: msg });
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
    console.error('Verification error:', e && (e.message || e));
    const msg = process.env.NODE_ENV === 'production' ? 'Verification failed' : (e.message || 'Verification failed');
    res.status(500).json({ error: msg });
  }
});

// Razorpay Webhook (asynchronous payment updates)
// NOTE: Must configure server to not parse JSON before signature verification. We'll manually parse here.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if(!secret) return res.status(500).send('Webhook secret missing');
    const signature = req.headers['x-razorpay-signature'];
    const bodyBuf = req.body; // Buffer
    const expected = crypto.createHmac('sha256', secret).update(bodyBuf).digest('hex');
    if(expected !== signature){ return res.status(400).send('Invalid signature'); }
    const payload = JSON.parse(bodyBuf.toString());
    const event = payload.event;
    // Extract order/payment ids
    const rzpOrderId = payload.payload?.order?.entity?.id || payload.payload?.payment?.entity?.order_id;
    const rzpPaymentId = payload.payload?.payment?.entity?.id;
    if(rzpOrderId){
      const order = await Order.findOne({ 'payment.razorpayOrderId': rzpOrderId });
      if(order){
        if(event === 'payment.captured' || event === 'order.paid'){
          order.payment.status = 'paid';
          if(rzpPaymentId) order.payment.razorpayPaymentId = rzpPaymentId;
          await order.save();
          const io = req.app.get('io');
          io?.to(order.user.toString()).emit('order_paid', { orderId: order._id.toString() });
          // Broadcast vendor-scoped events: find vendors in this order and notify their rooms.
          try {
            // populate items.food.vendor to determine vendor ids
            await order.populate({ path: 'items.food', populate: { path: 'vendor', select: '_id' } });
            const vendorIds = Array.from(new Set(order.items.map(i => i.food?.vendor?._id?.toString()).filter(Boolean)));
            if (vendorIds.length) {
              vendorIds.forEach(vId => {
                io?.to(`vendor_${vId}`).emit('new_order', { orderId: order._id.toString() });
                io?.to(`vendor_${vId}`).emit('orders_updated');
              });
            } else {
              // fallback to global broadcast
              io?.emit('new_order', { orderId: order._id.toString() });
            }
          } catch (e) {
            console.warn('Failed to emit vendor-scoped new_order:', e && (e.message || e));
            io?.emit('new_order', { orderId: order._id.toString() });
          }
        } else if(event === 'payment.failed'){
          order.payment.status = 'failed';
          await order.save();
          const io = req.app.get('io');
          io?.to(order.user.toString()).emit('order_payment_failed', { orderId: order._id.toString() });
          try {
            await order.populate({ path: 'items.food', populate: { path: 'vendor', select: '_id' } });
            const vendorIds = Array.from(new Set(order.items.map(i => i.food?.vendor?._id?.toString()).filter(Boolean)));
            if (vendorIds.length) {
              vendorIds.forEach(vId => io?.to(`vendor_${vId}`).emit('orders_updated'));
            } else {
              io?.emit('orders_updated');
            }
          } catch (e) {
            io?.emit('orders_updated');
          }
        }
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook processing error:', e && (e.message || e));
    res.status(500).send('Webhook error');
  }
});

export default router;
// Webhook must be appended after exports? Keep above. Add webhook route earlier.
