const mongoose = require('mongoose');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect('mongodb+srv://shayetet14:sdg5NrhmPFak8T3y@cluster0.2g7xxjp.mongodb.net/sodeclick?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
    const existingFiles = fs.readdirSync(uploadsDir);
    
    console.log(`Found ${existingFiles.length} files in uploads directory`);
    
    // Get all users with profile images
    const users = await User.find({ 
      profileImages: { $exists: true, $ne: [] } 
    });
    
    console.log(`Found ${users.length} users with profile images`);
    
    let totalUpdated = 0;
    let totalRemoved = 0;
    
    for (const user of users) {
      console.log(`\n🔍 Checking user: ${user.username} (${user._id})`);
      
      let hasChanges = false;
      const newProfileImages = [];
      let removedCount = 0;
      
      for (const imageUrl of user.profileImages) {
        let shouldKeep = true;
        let filename = '';
        
        // Extract filename from URL
        if (imageUrl.includes('/uploads/profiles/')) {
          filename = imageUrl.split('/uploads/profiles/')[1];
        } else if (imageUrl.includes('profile-')) {
          // Extract filename from full URL
          const urlParts = imageUrl.split('/');
          filename = urlParts[urlParts.length - 1];
        } else if (imageUrl.startsWith('data:image/svg+xml')) {
          // Keep SVG data
          shouldKeep = true;
          filename = 'SVG_DATA';
        }
        
        // Check if file exists (skip SVG data)
        if (filename && filename !== 'SVG_DATA' && !existingFiles.includes(filename)) {
          console.log(`❌ Missing file: ${filename}`);
          shouldKeep = false;
          removedCount++;
          totalRemoved++;
        } else if (filename && filename !== 'SVG_DATA') {
          console.log(`✅ File exists: ${filename}`);
        } else if (filename === 'SVG_DATA') {
          console.log(`📄 SVG data (keeping)`);
        }
        
        if (shouldKeep) {
          newProfileImages.push(imageUrl);
        } else {
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        user.profileImages = newProfileImages;
        await user.save();
        totalUpdated++;
        console.log(`✅ Updated user: ${user.username} (removed ${removedCount} missing images, ${newProfileImages.length} remaining)`);
      } else {
        console.log(`✅ User: ${user.username} (no changes needed, ${user.profileImages.length} images)`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Updated ${totalUpdated} users`);
    console.log(`- Removed ${totalRemoved} missing image references`);
    console.log(`- Total files in uploads: ${existingFiles.length}`);
    
    // Show all users with their current profile images
    console.log(`\n👥 All users with profile images:`);
    const allUsers = await User.find({ 
      profileImages: { $exists: true, $ne: [] } 
    }).select('username profileImages');
    
    allUsers.forEach(user => {
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
