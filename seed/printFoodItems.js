import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FoodItem from '../src/models/FoodItem.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vitato';

(async function(){
  try{
    await mongoose.connect(MONGO_URI);
    console.log('Connected to', MONGO_URI);
    const items = await FoodItem.find().limit(200).lean();
    if(!items.length) console.log('No food items found');
    for(const it of items){
      console.log('---');
      console.log('id:', it._id.toString());
      console.log('name:', it.name);
      console.log('image:', JSON.stringify(it.image));
      console.log('inStock:', it.inStock, 'price:', it.price, 'category:', it.category);
    }
  } catch(err){
    console.error('Error:', err.message);
  } finally{
    process.exit(0);
  }
})();
