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
    
    console.log(`🔍 Testing URLs for user: ${testUser.username} (${testUser._id})`);
    
    if (testUser.profileImages && testUser.profileImages.length > 0) {
      testUser.profileImages.forEach((image, index) => {
        console.log(`\nImage ${index + 1}:`);
        console.log(`  Original: ${image}`);
        
        // Test different URL constructions
        const baseUrl = 'https://sodeclick-backend-production.up.railway.app';
        
        if (image.startsWith('http')) {
          console.log(`  Type: Full URL`);
          console.log(`  Final URL: ${image}`);
        } else if (image.startsWith('data:image/svg+xml')) {
          console.log(`  Type: SVG data`);
          console.log(`  Final URL: ${image}`);
        } else {
          console.log(`  Type: Relative path`);
          console.log(`  Final URL: ${baseUrl}/uploads/profiles/${image}`);
        }
      });
    }
    
    // Test the first image specifically
    if (testUser.profileImages && testUser.profileImages.length > 0) {
      const firstImage = testUser.profileImages[0];
      let profileImage = '';
      
      if (firstImage.startsWith('http')) {
        profileImage = firstImage;
      } else if (firstImage.startsWith('data:image/svg+xml')) {
        profileImage = firstImage;
      } else {
        profileImage = `https://sodeclick-backend-production.up.railway.app/uploads/profiles/${firstImage}`;
      }
      
      console.log(`\n🎯 First image for homepage:`);
      console.log(`  Original: ${firstImage}`);
      console.log(`  Final URL: ${profileImage}`);
      
      // Test if URL is accessible
      console.log(`\n🌐 Testing URL accessibility...`);
      try {
        const response = await fetch(profileImage, { method: 'HEAD' });
        console.log(`  Status: ${response.status} ${response.statusText}`);
        console.log(`  Content-Type: ${response.headers.get('content-type')}`);
        console.log(`  Content-Length: ${response.headers.get('content-length')}`);
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
    }
    
    mongoose.disconnect();
  })
  .catch(console.error);
