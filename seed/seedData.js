import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vendor from '../src/models/Vendor.js';
import FoodItem from '../src/models/FoodItem.js';

dotenv.config();

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vitato');
  await Vendor.deleteMany();
  await FoodItem.deleteMany();
  const vendors = await Vendor.insertMany([
    { name: 'Cafeteria Central', description: 'Main campus cafe', categories: ['Meals','Snacks'], image: '/images/vendor1.jpg' },
    { name: 'Juice Junction', description: 'Fresh juices & beverages', categories: ['Beverages'], image: '/images/vendor2.jpg' }
  ]);
  const items = [
    { name: 'Veg Thali', vendor: vendors[0]._id, price: 90, category: 'Meals', image: '/images/veg_thali.jpg' },
    { name: 'Paneer Sandwich', vendor: vendors[0]._id, price: 60, category: 'Snacks', image: '/images/paneer_sandwich.jpg' },
    { name: 'Cold Coffee', vendor: vendors[1]._id, price: 50, category: 'Beverages', image: '/images/cold_coffee.jpg' },
    { name: 'Fresh Orange Juice', vendor: vendors[1]._id, price: 45, category: 'Beverages', image: '/images/orange_juice.jpg' }
  ];
  await FoodItem.insertMany(items);
  console.log('Seeded vendors & food items');
  process.exit(0);
})();
