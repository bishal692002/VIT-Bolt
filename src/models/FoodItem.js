import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema({
  name: String,
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  price: Number,
  category: String,
  image: String,
  available: { type: Boolean, default: true },
  inStock: { type: Boolean, default: true }
});

export default mongoose.model('FoodItem', foodItemSchema);
