import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['student', 'vendor', 'delivery', 'admin'], default: 'student' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, // link if role === vendor
  addresses: [{
    label: String,
    line1: String,
    line2: String,
    landmark: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model('User', userSchema);
