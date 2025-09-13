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
    
    console.log(`🔍 Testing second image for user: ${testUser.username} (${testUser._id})`);
    
    if (testUser.profileImages && testUser.profileImages.length > 1) {
      const secondImage = testUser.profileImages[1];
      console.log(`\n🎯 Second image:`);
      console.log(`  Original: ${secondImage}`);
      
      // Test if URL is accessible
      console.log(`\n🌐 Testing URL accessibility...`);
      try {
        const response = await fetch(secondImage, { method: 'HEAD' });
        console.log(`  Status: ${response.status} ${response.statusText}`);
        console.log(`  Content-Type: ${response.headers.get('content-type')}`);
        console.log(`  Content-Length: ${response.headers.get('content-length')}`);
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
    }
    
    // Update user to use only the second image (which exists locally)
    if (testUser.profileImages && testUser.profileImages.length > 1) {
      const secondImage = testUser.profileImages[1];
      testUser.profileImages = [secondImage]; // ใช้เฉพาะรูปที่ 2
      await testUser.save();
      
      console.log(`\n✅ Updated user "test" to use only the second image`);
      console.log(`New profile images:`, testUser.profileImages);
    }
    
    mongoose.disconnect();
  })
  .catch(console.error);
