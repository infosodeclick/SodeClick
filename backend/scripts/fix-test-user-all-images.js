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
    console.log('Current profile images:', testUser.profileImages);
    
    // Get uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
    const existingFiles = fs.readdirSync(uploadsDir);
    
    // Find all files for this user
    const userFiles = existingFiles.filter(file => file.includes(testUser._id.toString()));
    
    console.log(`📁 Found ${userFiles.length} files for user "test":`);
    userFiles.forEach(file => console.log(`  - ${file}`));
    
    // Create URLs for all user files
    const allImageUrls = userFiles.map(file => 
      `https://sodeclick-backend-production.up.railway.app/uploads/profiles/${file}`
    );
    
    console.log(`🖼️ All image URLs for user "test":`);
    allImageUrls.forEach(url => console.log(`  - ${url}`));
    
    // Update user with all images
    testUser.profileImages = allImageUrls;
    await testUser.save();
    
    console.log(`✅ Updated user "test" with ${allImageUrls.length} images`);
    console.log('New profile images:', testUser.profileImages);
    
    // Show final status
    console.log(`\n📊 Final status of all users:`);
    const finalUsers = await User.find({ 
      profileImages: { $exists: true, $ne: [] } 
    }).select('username profileImages');
    
    finalUsers.forEach(user => {
      console.log(`\n${user.username}:`);
      user.profileImages.forEach((image, index) => {
        if (image.startsWith('data:image/svg+xml')) {
          console.log(`  ${index + 1}. SVG data`);
        } else {
          const filename = image.includes('/') ? image.split('/').pop() : image;
          console.log(`  ${index + 1}. ${filename}`);
        }
      });
    });
    
    mongoose.disconnect();
  })
  .catch(console.error);
