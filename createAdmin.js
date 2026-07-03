require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';

mongoose.connect(dbURI)
  .then(async () => {
    const isLocal = dbURI.includes('localhost') || dbURI.includes('127.0.0.1');
    console.log(`Connected to: ${isLocal ? 'Local Database' : 'MongoDB Atlas Cloud Database'}`);
    
    // CHANGE THESE TO YOUR DESIRED CREDENTIALS
    const adminUsername = 'admin'; 
    const adminPassword = 'MySecurePassword123'; 

    // Encrypt the password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create the user object matching your Schema
    const UserSchema = new mongoose.Schema({ username: String, password: String });
    const User = mongoose.model('User', UserSchema);

    // Check if user already exists
    let user = await User.findOne({ username: adminUsername });
    if (user) {
      console.log(`User "${adminUsername}" already exists. Updating password to new credentials...`);
      user.password = hashedPassword;
      await user.save();
      console.log('--------------------------------------------------');
      console.log('✅ ADMIN PASSWORD UPDATED SUCCESSFULLY!');
      console.log(`Username: ${adminUsername}`);
      console.log(`Password: ${adminPassword}`);
      console.log('--------------------------------------------------');
      process.exit();
    }

    user = new User({ username: adminUsername, password: hashedPassword });
    await user.save();

    console.log('--------------------------------------------------');
    console.log('✅ ADMIN USER CREATED SUCCESSFULLY!');
    console.log(`Username: ${adminUsername}`);
    console.log(`Password: ${adminPassword}`);
    console.log('--------------------------------------------------');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Connection or Execution error:', err);
    process.exit(1);
  });