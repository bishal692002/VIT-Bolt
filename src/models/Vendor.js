import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: String,
  description: String,
  categories: [String],
  image: String,
  isActive: { type: Boolean, default: true }
});

export default mongoose.model('Vendor', vendorSchema);
