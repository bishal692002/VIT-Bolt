import mongoose from 'mongoose';

const vendorApplicationSchema = new mongoose.Schema({
  applicationNumber: { type: String, unique: true, required: true },
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  cuisineType: { type: String, required: true },
  licenseId: String, // optional for future use
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: String,
  rejectionReason: String,
  // Store credentials when approved
  credentials: {
    vendorId: String,
    email: String,
    password: String, // Store the plain password for display (in production, send via email instead)
    username: String
  }
}, { timestamps: true });

export default mongoose.model('VendorApplication', vendorApplicationSchema);
