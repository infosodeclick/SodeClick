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
    
    // Fix localhost URLs to production URLs
    let hasChanges = false;
    const newProfileImages = testUser.profileImages.map(imageUrl => {
      if (imageUrl.includes('localhost:5000')) {
        const newUrl = imageUrl.replace('http://localhost:5000', 'https://sodeclick-backend-production.up.railway.app');
        console.log(`🔄 Fixing URL: ${imageUrl} -> ${newUrl}`);
        hasChanges = true;
        return newUrl;
      }
      return imageUrl;
    });
    
    if (hasChanges) {
      testUser.profileImages = newProfileImages;
      await testUser.save();
      
      console.log(`✅ Updated user "test" with production URLs`);
      console.log('New profile images:', testUser.profileImages);
    } else {
      console.log('✅ No URL changes needed for user "test"');
    }
    
    // Also fix other users with localhost URLs
    const allUsers = await User.find({ 
      profileImages: { $exists: true, $ne: [] } 
    });
    
    console.log(`\n🔍 Checking all users for localhost URLs...`);
    
    for (const user of allUsers) {
      let userHasChanges = false;
      const newProfileImages = user.profileImages.map(imageUrl => {
        if (imageUrl.includes('localhost:5000')) {
          const newUrl = imageUrl.replace('http://localhost:5000', 'https://sodeclick-backend-production.up.railway.app');
          console.log(`🔄 Fixing URL for ${user.username}: ${imageUrl} -> ${newUrl}`);
          userHasChanges = true;
          return newUrl;
        }
        return imageUrl;
      });
      
      if (userHasChanges) {
        user.profileImages = newProfileImages;
        await user.save();
        console.log(`✅ Updated user ${user.username} with production URLs`);
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
