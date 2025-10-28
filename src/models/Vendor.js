import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: String,
  description: String,
  categories: [String],
  image: String,
  isActive: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: true },
  contactEmail: String,
  contactPhone: String,
  address: String,
  ownerName: String
}, { timestamps: true });

export default mongoose.model('Vendor', vendorSchema);
