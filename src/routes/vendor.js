import { Router } from 'express';
import FoodItem from '../models/FoodItem.js';
import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import { ensureAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Middleware to ensure vendor role
const requireVendor = (req, res, next) => {
  if (!req.user || req.user.role !== 'vendor') {
    return res.status(403).json({ error: 'Vendor access required' });
  }
  next();
};

// Resolve vendor document reliably (from token or by user linkage)
async function resolveVendor(req) {
  try {
    if (req.user?.vendor) {
      const byId = await Vendor.findById(req.user.vendor);
      if (byId) return byId;
    }
    if (req.user?._id) {
      const byUser = await Vendor.findOne({ user: req.user._id });
      if (byUser) return byUser;
    }
  } catch (e) {
    // ignore, handled by caller
  }
  return null;
}

// Get vendor profile
router.get('/profile', ensureAuth, requireVendor, async (req, res) => {
  try {
    const vendor = await resolveVendor(req);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json({
      _id: vendor._id,
      businessName: vendor.businessName,
      name: req.user.name,
      email: req.user.email,
      phone: vendor.phone,
      address: vendor.address,
      isOnline: vendor.isOnline !== false // Default to true if not set
    });
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update vendor online status
router.put('/status', ensureAuth, requireVendor, async (req, res) => {
  try {
    const vendor = await resolveVendor(req);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const { isOnline } = req.body;
    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: 'isOnline must be a boolean' });
    }

    vendor.isOnline = isOnline;
    await vendor.save();

    console.log(`Vendor ${vendor.name || vendor._id} status updated to: ${isOnline ? 'Online' : 'Offline'}`);
    
    res.json({ 
      success: true, 
      isOnline: vendor.isOnline,
      message: `Vendor is now ${isOnline ? 'online' : 'offline'}` 
    });
  } catch (error) {
    console.error('Error updating vendor status:', error);
    res.status(500).json({ error: 'Failed to update vendor status' });
  }
});

// Get vendor stats
router.get('/stats', ensureAuth, requireVendor, async (req, res) => {
  try {
    const vendor = await resolveVendor(req);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get all orders for this vendor's menu items
    const menuItems = await FoodItem.find({ vendor: vendor._id });
    const menuItemIds = menuItems.map(item => item._id);

    // Total orders
    const totalOrders = await Order.countDocuments({
      'items.food': { $in: menuItemIds }
    });

    // Pending orders
    const pendingOrders = await Order.countDocuments({
      'items.food': { $in: menuItemIds },
      status: 'placed'
    });

    // Total revenue (sum of all delivered orders)
    const revenueOrders = await Order.find({
      'items.food': { $in: menuItemIds },
      status: 'delivered'
    });
    
    let totalRevenue = 0;
    revenueOrders.forEach(order => {
      order.items.forEach(item => {
        if (menuItemIds.some(id => id.equals(item.food))) {
          totalRevenue += item.price * item.quantity;
        }
      });
    });

    // Total menu items
    const totalMenuItems = menuItems.length;
    const availableItems = menuItems.filter(item => item.available).length;

    // Revenue by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const revenueByDay = await Order.aggregate([
      {
        $match: {
          'items.food': { $in: menuItemIds },
          status: 'delivered',
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.food': { $in: menuItemIds }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $match: {
          'items.food': { $in: menuItemIds }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = {};
    ordersByStatus.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    // Format revenue data for chart
    const labels = [];
    const values = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      labels.push(dayName);
      
      const dayData = revenueByDay.find(d => d._id === dateStr);
      values.push(dayData ? dayData.total : 0);
    }

    res.json({
      totalRevenue,
      totalOrders,
      totalMenuItems,
      availableItems,
      pendingOrders,
      revenueChange: `${totalOrders} orders this month`,
      ordersChange: `${pendingOrders} pending`,
      menuChange: `${availableItems} available`,
      revenueData: {
        labels,
        values
      },
      ordersByStatus: statusCounts
    });
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get vendor orders
router.get('/orders', ensureAuth, requireVendor, async (req, res) => {
  try {
    const vendor = await resolveVendor(req);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const menuItems = await FoodItem.find({ vendor: vendor._id });
    const menuItemIds = menuItems.map(item => item._id);

    const orders = await Order.find({
      'items.food': { $in: menuItemIds }
    })
    .populate('user', 'name email')
    .populate('items.food')
    .populate('deliveryPartner', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
// Support both PUT and POST for status updates to align with FE/APIs
async function updateOrderStatusHandler(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'cooking', 'ready', 'out_for_delivery', 'delivered'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const vendor = await resolveVendor(req);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const order = await Order.findById(req.params.id).populate('items.food');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify this order belongs to this vendor
    const menuItems = await FoodItem.find({ vendor: vendor._id });
    const menuItemIds = menuItems.map(item => item._id.toString());
    
    const hasVendorItem = order.items.some(item => 
      menuItemIds.includes(item.food._id.toString())
    );

    if (!hasVendorItem) {
      return res.status(403).json({ error: 'This order does not belong to your restaurant' });
    }

    order.status = status;
    await order.save();

    // Emit socket events if available
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('orders_updated');
        io.to(`order_${order._id}`).emit('order_status', { orderId: order._id.toString(), status: order.status });
        io.to(order.user.toString()).emit('order_status', { orderId: order._id.toString(), status: order.status });
      }
    } catch {}

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
}

router.put('/orders/:id/status', ensureAuth, requireVendor, updateOrderStatusHandler);
router.post('/orders/:id/status', ensureAuth, requireVendor, updateOrderStatusHandler);

// Get vendor menu items
router.get('/menu', ensureAuth, requireVendor, async (req, res) => {
  try {
    const vendor = await resolveVendor(req);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const items = await FoodItem.find({ vendor: vendor._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Add menu item
router.post('/menu', ensureAuth, requireVendor, async (req, res) => {
  try {
    const vendor = await resolveVendor(req);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const { name, price, category, image, available } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const item = new FoodItem({
      name,
      vendor: vendor._id,
      price,
      category: category || 'Other',
      image: image || '',
      available: available !== false,
      inStock: true
    });

    await item.save();
    // socket notify
    try { req.app.get('io')?.emit('menu_updated'); } catch {}
    res.json({ success: true, item });
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

// Update menu item
router.put('/menu/:id', ensureAuth, requireVendor, async (req, res) => {
  try {
    const vendor = await resolveVendor(req);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const item = await FoodItem.findOne({ _id: req.params.id, vendor: vendor._id });
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const { name, price, category, image, available, inStock } = req.body;

    if (name !== undefined) item.name = name;
    if (price !== undefined) item.price = price;
    if (category !== undefined) item.category = category;
    if (image !== undefined) item.image = image;
    if (available !== undefined) item.available = available;
    if (inStock !== undefined) item.inStock = inStock;

    await item.save();
    try { req.app.get('io')?.emit('menu_updated'); } catch {}
    res.json({ success: true, item });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
router.delete('/menu/:id', ensureAuth, requireVendor, async (req, res) => {
  try {
    const vendor = await resolveVendor(req);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const item = await FoodItem.findOne({ _id: req.params.id, vendor: vendor._id });
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await item.deleteOne();
    try { req.app.get('io')?.emit('menu_updated'); } catch {}
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

export default router;
