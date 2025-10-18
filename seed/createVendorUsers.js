import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import Vendor from '../src/models/Vendor.js';
import User from '../src/models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vitato';

function slugify(name){
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,40);
}

(async function main(){
  await mongoose.connect(MONGO_URI);
  console.log('Connected to', MONGO_URI);

  let vendors = await Vendor.find();
  if(!vendors || vendors.length === 0){
    console.log('No vendors found — creating demo vendors');
    vendors = await Vendor.insertMany([
      { name: 'Cafeteria Central', description: 'Main campus cafe', categories: ['Meals','Snacks'], image: '/images/vendor1.jpg' },
      { name: 'Juice Junction', description: 'Fresh juices & beverages', categories: ['Beverages'], image: '/images/vendor2.jpg' }
    ]);
  }

  const defaultPassword = process.env.DEFAULT_VENDOR_PASSWORD || 'vendorpass123';

  for(const v of vendors){
    const slug = slugify(v.name || String(v._id));
    const email = `${slug}@vendor.local`;

    // Try to find an existing user by vendor ref or email
    let user = await User.findOne({ $or: [{ vendor: v._id }, { email }] });
    if(user){
      let changed = false;
      if(user.role !== 'vendor'){ user.role = 'vendor'; changed = true; }
      if(!user.vendor || user.vendor.toString() !== v._id.toString()){ user.vendor = v._id; changed = true; }
      if(changed){
        await user.save();
        console.log(`Updated existing user ${user.email} -> role=vendor, linked vendor ${v.name}`);
      } else {
        console.log(`User ${user.email} already configured for vendor ${v.name}`);
      }
    } else {
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      const name = `${v.name} (Vendor Account)`;
      user = await User.create({ name, email, passwordHash, role: 'vendor', vendor: v._id });
      console.log(`Created vendor user ${email} with password (env DEFAULT_VENDOR_PASSWORD or fallback).`);
    }
  }

  console.log('Done creating/updating vendor users.');
  process.exit(0);
})();
