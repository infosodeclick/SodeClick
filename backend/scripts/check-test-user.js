const mongoose = require('mongoose');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect('mongodb+srv://shayetet14:sdg5NrhmPFak8T3y@cluster0.2g7xxjp.mongodb.net/sodeclick?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find user "test"
    const testUser = await User.findOne({ username: 'test' });
    
    if (!testUser) {
      console.log('❌ User "test" not found');
      mongoose.disconnect();
      return;
    }
    
    console.log(`🔍 Found user: ${testUser.username} (${testUser._id})`);
    console.log('Profile images count:', testUser.profileImages ? testUser.profileImages.length : 0);
    
    if (testUser.profileImages && testUser.profileImages.length > 0) {
      console.log('Profile images:');
      testUser.profileImages.forEach((image, index) => {
        console.log(`  ${index + 1}. ${image}`);
        
        // Check if it's a file URL
        if (image.includes('/uploads/profiles/')) {
          const filename = image.split('/uploads/profiles/')[1];
          const filePath = path.join(__dirname, '..', 'uploads', 'profiles', filename);
          const exists = fs.existsSync(filePath);
          console.log(`     File: ${filename} - ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
        } else if (image.startsWith('data:image/svg+xml')) {
          console.log(`     Type: SVG data`);
        }
      });
    } else {
      console.log('❌ No profile images found');
    }
    
    // Check all files for this user
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
    const existingFiles = fs.readdirSync(uploadsDir);
    const userFiles = existingFiles.filter(file => file.includes(testUser._id.toString()));
    
    console.log(`\n📁 Files in uploads directory for user "test":`);
    if (userFiles.length > 0) {
      userFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
    } else {
      console.log('  No files found');
    }
    
    // Show all users with profile images
    console.log(`\n👥 All users with profile images:`);
    const allUsers = await User.find({ 
      profileImages: { $exists: true, $ne: [] } 
    }).select('username profileImages');
    
    allUsers.forEach(user => {
      console.log(`\n${user.username} (${user._id}):`);
      if (user.profileImages && user.profileImages.length > 0) {
        user.profileImages.forEach((image, index) => {
          if (image.startsWith('data:image/svg+xml')) {
            console.log(`  ${index + 1}. SVG data`);
          } else {
            const filename = image.includes('/') ? image.split('/').pop() : image;
            console.log(`  ${index + 1}. ${filename}`);
          }
        });
      }
    });
    
    mongoose.disconnect();
  })
  .catch(console.error);
