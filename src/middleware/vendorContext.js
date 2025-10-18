import Vendor from '../models/Vendor.js';

// Unified vendor resolver middleware
// Attaches req.vendor and req.vendorId
export async function ensureVendorContext(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      return res.status(403).json({ error: 'Vendor not found' });
    }
    let vendorDoc = null;
    // 1) Prefer vendor id from token
    if (req.user.vendor) {
      vendorDoc = await Vendor.findById(req.user.vendor);
    }
    // 2) Try link by user field (legacy)
    if (!vendorDoc && req.user.id) {
      vendorDoc = await Vendor.findOne({ user: req.user.id });
    }
    // 3) Fallback by contactEmail
    if (!vendorDoc && req.user.email) {
      vendorDoc = await Vendor.findOne({ contactEmail: req.user.email.toLowerCase() });
    }
    if (!vendorDoc) {
      return res.status(403).json({ error: 'Vendor not found' });
    }
    req.vendor = vendorDoc;
    req.vendorId = vendorDoc._id;
    next();
  } catch (e) {
    console.error('ensureVendorContext error:', e && (e.message || e));
    res.status(500).json({ error: 'Vendor resolution failed' });
  }
}

export default ensureVendorContext;