const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to your local database
mongoose.connect('mongodb://localhost:27017/portfolio')
  .then(async () => {
    console.log('Connected to MongoDB to create admin...');
    
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
    const existingUser = await User.findOne({ username: adminUsername });
    if (existingUser) {
      console.log(`User "${adminUsername}" already exists!`);
      process.exit();
    }

    const admin = new User({ username: adminUsername, password: hashedPassword });
    await admin.save();

    console.log('--------------------------------------------------');
    console.log('✅ ADMIN USER CREATED SUCCESSFULLY!');
    console.log(`Username: ${adminUsername}`);
    console.log(`Password: ${adminPassword}`);
    console.log('--------------------------------------------------');
    process.exit();
  })
  .catch(err => console.error(err));