import { Router } from 'express';
import bcrypt from 'bcrypt';
import VendorApplication from '../models/VendorApplication.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import FoodItem from '../models/FoodItem.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// Get all pending vendor applications
router.get('/applications', adminAuth, async (req, res) => {
  try {
    const applications = await VendorApplication.find({ status: 'pending' }).sort({ submittedAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get all applications (including approved/rejected)
router.get('/applications/all', adminAuth, async (req, res) => {
  try {
    const applications = await VendorApplication.find().sort({ submittedAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get specific application by application number
router.get('/applications/by-number/:appNumber', adminAuth, async (req, res) => {
  try {
    const application = await VendorApplication.findOne({ applicationNumber: req.params.appNumber });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Also get user and vendor details if approved
    let userDetails = null;
    let vendorDetails = null;
    
    if (application.status === 'approved') {
      const user = await User.findOne({ email: application.email.toLowerCase() });
      const vendor = await Vendor.findOne({ contactEmail: application.email });
      
      if (user) {
        userDetails = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
      
      if (vendor) {
        vendorDetails = {
          id: vendor._id,
          name: vendor.name,
          isActive: vendor.isActive
        };
      }
    }
    
    res.json({
      application,
      user: userDetails,
      vendor: vendorDetails
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Approve vendor application
router.post('/applications/:id/approve', adminAuth, async (req, res) => {
  try {
    const application = await VendorApplication.findById(req.params.id);
    
    if (!application || application.status !== 'pending') {
      return res.status(400).json({ error: 'Application not found or already processed' });
    }
    
    // Generate vendor username and password
    const username = application.businessName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Math.random().toString(36).slice(2, 6);
    const password = 'vendor_' + Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create vendor document
    const vendor = await Vendor.create({
      name: application.businessName,
      description: `${application.cuisineType} cuisine`,
      categories: [application.cuisineType],
      image: '',
      isActive: true,
      contactEmail: application.email,
      contactPhone: application.contactNumber,
      address: application.address,
      ownerName: application.ownerName
    });
    
    // Create user account for vendor
    const user = await User.create({
      name: application.ownerName,
      email: application.email.toLowerCase(),
      passwordHash,
      phone: application.contactNumber,
      role: 'vendor',
      vendor: vendor._id
    });
    
    // Update application status and save credentials
    application.status = 'approved';
    application.reviewedAt = new Date();
    application.reviewedBy = 'admin';
    application.credentials = {
      vendorId: vendor._id.toString(),
      email: application.email,
      password: password,
      username: username
    };
    await application.save();
    
    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.emit('vendor_approved', {
        applicationId: application._id,
        vendorId: vendor._id,
        businessName: application.businessName
      });
    }
    
    res.json({
      success: true,
      message: 'Vendor application approved successfully. Credentials saved to application.',
      vendor: vendor,
      user: user
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to approve application: ' + error.message });
  }
});

// Regenerate credentials for approved application (fix for already approved apps)
router.post('/applications/:id/regenerate-credentials', adminAuth, async (req, res) => {
  try {
    const application = await VendorApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (application.status !== 'approved') {
      return res.status(400).json({ error: 'Application must be approved first' });
    }
    
    // Find existing user and vendor
    const user = await User.findOne({ email: application.email.toLowerCase() });
    const vendor = await Vendor.findOne({ contactEmail: application.email });
    
    if (!user || !vendor) {
      return res.status(404).json({ error: 'User or Vendor not found. Application may need to be re-approved.' });
    }
    
    // Generate new password
    const newPassword = 'vendor_' + Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    user.passwordHash = passwordHash;
    await user.save();
    
    // Update application with credentials
    application.credentials = {
      vendorId: vendor._id.toString(),
      email: application.email,
      password: newPassword,
      username: user.name.toLowerCase().replace(/\s+/g, '_')
    };
    await application.save();
    
    res.json({
      success: true,
      message: 'Credentials regenerated successfully',
      credentials: application.credentials
    });
  } catch (error) {
    console.error('Regenerate credentials error:', error);
    res.status(500).json({ error: 'Failed to regenerate credentials: ' + error.message });
  }
});

// Regenerate credentials by application number (simpler endpoint)
router.post('/applications/regenerate/:appNumber', adminAuth, async (req, res) => {
  try {
    const application = await VendorApplication.findOne({ applicationNumber: req.params.appNumber });
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (application.status !== 'approved') {
      return res.status(400).json({ error: 'Application must be approved first' });
    }
    
    // Find existing user and vendor
    const user = await User.findOne({ email: application.email.toLowerCase() });
    const vendor = await Vendor.findOne({ contactEmail: application.email });
    
    if (!user || !vendor) {
      return res.status(404).json({ error: 'User or Vendor not found in database. They may not have been created during approval.' });
    }
    
    // Generate new password
    const newPassword = 'vendor_' + Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    user.passwordHash = passwordHash;
    await user.save();
    
    // Update application with credentials
    application.credentials = {
      vendorId: vendor._id.toString(),
      email: application.email,
      password: newPassword,
      username: user.name.toLowerCase().replace(/\s+/g, '_')
    };
    await application.save();
    
    res.json({
      success: true,
      message: 'Credentials regenerated and saved successfully',
      applicationNumber: application.applicationNumber,
      credentials: application.credentials
    });
  } catch (error) {
    console.error('Regenerate credentials error:', error);
    res.status(500).json({ error: 'Failed to regenerate credentials: ' + error.message });
  }
});

// Reject vendor application
router.post('/applications/:id/reject', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const application = await VendorApplication.findById(req.params.id);
    
    if (!application || application.status !== 'pending') {
      return res.status(400).json({ error: 'Application not found or already processed' });
    }
    
    application.status = 'rejected';
    application.reviewedAt = new Date();
    application.reviewedBy = 'admin';
    application.rejectionReason = reason || 'Not specified';
    await application.save();
    
    res.json({ success: true, message: 'Application rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// Get all vendors
router.get('/vendors', adminAuth, async (req, res) => {
  try {
    const vendors = await Vendor.find();
    const vendorsWithUsers = await Promise.all(
      vendors.map(async (vendor) => {
        const user = await User.findOne({ vendor: vendor._id });
        return {
          ...vendor.toObject(),
          userEmail: user?.email,
          userName: user?.name
        };
      })
    );
    res.json(vendorsWithUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Toggle vendor active status
router.patch('/vendors/:id/toggle', adminAuth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    vendor.isActive = !vendor.isActive;
    await vendor.save();
    
    res.json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor status' });
  }
});

// Analytics - Dashboard stats
router.get('/analytics/stats', adminAuth, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    // Sum revenue from PAID orders; use order total (gross customer charge)
    const totalRevenue = await Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const paidCount = await Order.countDocuments({ 'payment.status': 'paid' });
    // Platform earnings: ₹5 per paid order (₹15 delivery fee - ₹10 rider payout)
    const platformEarnings = paidCount * 5;
    
    const totalVendors = await Vendor.countDocuments();
    const activeVendors = await Vendor.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments();
    const pendingApplications = await VendorApplication.countDocuments({ status: 'pending' });
    
    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      paidOrders: paidCount,
      platformEarnings,
      totalVendors,
      activeVendors,
      totalUsers,
      pendingApplications
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Analytics - Orders over time
router.get('/analytics/orders-timeline', adminAuth, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    let groupBy;
    let daysBack;
    
    if (period === 'day') {
      daysBack = 1;
      groupBy = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
    } else if (period === 'month') {
      daysBack = 30;
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    } else {
      daysBack = 7;
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const timeline = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, 'payment.status': 'paid' } },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    // Post-process to ensure fixed buckets and stable order (prevents visual growth glitches)
    function pad(n){ return String(n).padStart(2, '0'); }
    function fmtUTC(d, withHour){
      const y = d.getUTCFullYear();
      const m = pad(d.getUTCMonth()+1);
      const day = pad(d.getUTCDate());
      if(!withHour) return `${y}-${m}-${day}`;
      const h = pad(d.getUTCHours());
      return `${y}-${m}-${day} ${h}:00`;
    }
    const map = Object.fromEntries(timeline.map(t => [t._id, { count: t.count, revenue: t.revenue }]));
    const now = new Date();
    const filled = [];
    if (period === 'day') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i*60*60*1000);
        const key = fmtUTC(d, true);
        const v = map[key] || { count: 0, revenue: 0 };
        filled.push({ _id: key, count: v.count, revenue: v.revenue });
      }
    } else if (period === 'month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i*24*60*60*1000);
        const key = fmtUTC(d, false);
        const v = map[key] || { count: 0, revenue: 0 };
        filled.push({ _id: key, count: v.count, revenue: v.revenue });
      }
    } else { // week
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i*24*60*60*1000);
        const key = fmtUTC(d, false);
        const v = map[key] || { count: 0, revenue: 0 };
        filled.push({ _id: key, count: v.count, revenue: v.revenue });
      }
    }
    res.json(filled);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders timeline' });
  }
});

// Analytics - Top vendors
router.get('/analytics/top-vendors', adminAuth, async (req, res) => {
  try {
    const topVendors = await Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'fooditems',
          localField: 'items.food',
          foreignField: '_id',
          as: 'foodItem'
        }
      },
      { $unwind: '$foodItem' },
      {
        $group: {
          _id: '$foodItem.vendor',
          orderCount: { $sum: 1 },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      {
        $project: {
          vendorName: '$vendor.name',
          orderCount: 1,
          revenue: 1
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
    
    res.json(topVendors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top vendors' });
  }
});

// Analytics - Popular items
router.get('/analytics/popular-items', adminAuth, async (req, res) => {
  try {
    const popularItems = await Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.food',
          totalQuantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'fooditems',
          localField: '_id',
          foreignField: '_id',
          as: 'item'
        }
      },
      { $unwind: '$item' },
      {
        $project: {
          itemName: '$item.name',
          totalQuantity: 1,
          revenue: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);
    
    res.json(popularItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch popular items' });
  }
});

// Database browser - Get all collections data
router.get('/database/:collection', adminAuth, async (req, res) => {
  try {
    const { collection } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    let Model;
    switch (collection) {
      case 'users': Model = User; break;
      case 'vendors': Model = Vendor; break;
      case 'orders': Model = Order; break;
      case 'fooditems': Model = FoodItem; break;
      case 'applications': Model = VendorApplication; break;
      default: return res.status(400).json({ error: 'Invalid collection' });
    }
    
    const data = await Model.find()
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });
    
    const total = await Model.countDocuments();
    
    res.json({ data, total, limit: parseInt(limit), skip: parseInt(skip) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Export data as JSON
router.get('/export/:collection', adminAuth, async (req, res) => {
  try {
    const { collection } = req.params;
    
    let Model;
    let filename;
    switch (collection) {
      case 'users': Model = User; filename = 'users'; break;
      case 'vendors': Model = Vendor; filename = 'vendors'; break;
      case 'orders': Model = Order; filename = 'orders'; break;
      case 'fooditems': Model = FoodItem; filename = 'food-items'; break;
      case 'applications': Model = VendorApplication; filename = 'vendor-applications'; break;
      default: return res.status(400).json({ error: 'Invalid collection' });
    }
    
    const data = await Model.find();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.json"`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
