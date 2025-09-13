const mongoose = require('mongoose');
const User = require('../models/User');

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
    
    // Filter out SVG data and keep only real images
    const realImages = testUser.profileImages.filter(img => !img.startsWith('data:image/svg+xml'));
    
    console.log('Real images found:', realImages);
    
    if (realImages.length > 0) {
      // Update profile images to only include real images
      testUser.profileImages = realImages;
      await testUser.save();
      
      console.log(`✅ Updated user "test" with ${realImages.length} real images`);
      console.log('New profile images:', testUser.profileImages);
    } else {
      console.log('❌ No real images found for user "test"');
    }
    
    // Also check other users and fix their profile images
    const allUsers = await User.find({ 
      profileImages: { $exists: true, $ne: [] } 
    });
    
    console.log(`\n🔍 Checking all users...`);
    
    for (const user of allUsers) {
      const realImages = user.profileImages.filter(img => !img.startsWith('data:image/svg+xml'));
      
      if (realImages.length > 0 && realImages.length !== user.profileImages.length) {
        console.log(`\n🔧 Fixing user: ${user.username}`);
        console.log(`Before: ${user.profileImages.length} images (${user.profileImages.length - realImages.length} SVG)`);
        
        user.profileImages = realImages;
        await user.save();
        
        console.log(`After: ${user.profileImages.length} real images`);
      }
    }
    
    // Show final status
    console.log(`\n📊 Final status of all users:`);
    const finalUsers = await User.find({ 
      profileImages: { $exists: true, $ne: [] } 
    }).select('username profileImages');
    
    finalUsers.forEach(user => {
      console.log(`\n${user.username}:`);
      user.profileImages.forEach((image, index) => {
        const filename = image.includes('/') ? image.split('/').pop() : image;
        console.log(`  ${index + 1}. ${filename}`);
      });
    });
    
    mongoose.disconnect();
  })
  .catch(console.error);
