import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
    quantity: Number,
    price: Number
  }],
  status: { type: String, enum: ['preparing', 'out_for_delivery', 'delivered'], default: 'preparing' },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  total: Number,
  deliveryFee: Number
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
