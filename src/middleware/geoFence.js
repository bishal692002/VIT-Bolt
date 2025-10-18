// Basic placeholder implementation.
// Option A: Check IP ranges (campus WiFi). Provide list via env.
// Option B: Accept approximate location lat/lng from client and verify.

const allowedSubnets = (process.env.ALLOWED_SUBNETS || '10.0.0.,192.168.1.').split(',');

export function geoFenceMiddleware(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
  const allowed = allowedSubnets.some(sub => ip.startsWith(sub));
  if (!allowed) {
    // For now we just warn but still allow in dev.
    if (process.env.ENFORCE_GEOFENCE === 'true') {
      return res.status(403).json({ error: 'Orders restricted to campus network' });
    }
  }
  next();
}
