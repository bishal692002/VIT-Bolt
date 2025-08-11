import { Server } from 'socket.io';
import Order from '../models/Order.js';

export default function orderSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
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
