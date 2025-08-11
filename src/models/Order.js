import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
    quantity: Number,
    price: Number
  }],
  status: { type: String, enum: ['placed','cooking','ready','out_for_delivery','delivered'], default: 'placed' },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  total: Number,
  deliveryFee: Number,
  payment: {
    provider: { type: String, default: 'razorpay' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: { type: String, enum: ['pending','paid','failed'], default: 'pending' }
  }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
