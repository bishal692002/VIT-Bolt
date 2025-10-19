import { Server } from 'socket.io';
import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';
import jwt from 'jsonwebtoken';

export default function orderSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    // Optional JWT auth via query token
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt');
        socket.join(payload.id);
        // If vendor, try to join vendor_<vendorId> room for scoped broadcasts.
        // Payload may not include vendor id (legacy). Attempt to join using vendor id if present,
        // otherwise try to resolve by querying Vendor model by linked user id or contactEmail.
        if (payload.role === 'vendor') {
          if (payload.vendor) {
            socket.join(`vendor_${payload.vendor.toString()}`);
          } else {
            // try to resolve vendor by linked user or email
            (async () => {
              try {
                let vendorDoc = null;
                if (payload.id) {
                  vendorDoc = await Vendor.findOne({ user: payload.id });
                }
                if (!vendorDoc && payload.email) {
                  vendorDoc = await Vendor.findOne({ contactEmail: payload.email.toLowerCase() });
                }
                if (vendorDoc) {
                  socket.join(`vendor_${vendorDoc._id.toString()}`);
                  if (process.env.NODE_ENV !== 'production') console.log('[socket] joined vendor room for resolved vendor', vendorDoc._id.toString());
                } else {
                  if (process.env.NODE_ENV !== 'production') console.log('[socket] vendor payload present but no vendor resolved for user', payload.id);
                }
              } catch (e) {
                if (process.env.NODE_ENV !== 'production') console.warn('[socket] vendor resolution failed', e && (e.message || e));
              }
            })();
          }
        }
      } catch {}
    }
    socket.on('join_user', (userId) => {
      socket.join(userId);
    });

    socket.on('subscribe_order', (orderId) => {
      socket.join(`order_${orderId}`);
    });
  });

  // Expose io for routes
  httpServer.listen && httpServer.on && ( () => {} );
  // patch express app access via closure: attach to global? We'll set on app externally.
  // We'll provide helper for updating status.
  const updateOrderStatus = async (orderId, status) => {
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    if (order) {
      io.to(`order_${orderId}`).emit('order_status', { orderId, status: order.status });
      io.to(order.user.toString()).emit('order_status', { orderId, status: order.status });
    }
  };

  return io;
}
