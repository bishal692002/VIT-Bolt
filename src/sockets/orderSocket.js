import { Server } from 'socket.io';
import Order from '../models/Order.js';
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
