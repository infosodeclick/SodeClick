const mongoose = require('mongoose');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect('mongodb+srv://shayetet14:sdg5NrhmPFak8T3y@cluster0.2g7xxjp.mongodb.net/sodeclick?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get all users with profile images
    const users = await User.find({ 
      profileImages: { $exists: true, $ne: [] } 
    });
    
    console.log(`Found ${users.length} users with profile images`);
    
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
    const existingFiles = fs.readdirSync(uploadsDir);
    
    console.log(`Found ${existingFiles.length} files in uploads directory`);
    
    let updatedCount = 0;
    let removedCount = 0;
    
    for (const user of users) {
      let hasChanges = false;
      const newProfileImages = [];
      
      for (const imageUrl of user.profileImages) {
        let shouldKeep = true;
        
        // Extract filename from URL
        let filename = '';
        if (imageUrl.includes('/uploads/profiles/')) {
          filename = imageUrl.split('/uploads/profiles/')[1];
        } else if (imageUrl.includes('profile-')) {
          // Extract filename from full URL
          const urlParts = imageUrl.split('/');
          filename = urlParts[urlParts.length - 1];
        }
        
        // Check if file exists
        if (filename && !existingFiles.includes(filename)) {
          console.log(`❌ Missing file for user ${user.username}: ${filename}`);
          shouldKeep = false;
          removedCount++;
        } else if (filename) {
          console.log(`✅ File exists for user ${user.username}: ${filename}`);
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
        updatedCount++;
        console.log(`Updated user: ${user.username} (${user.profileImages.length} images remaining)`);
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`- Updated ${updatedCount} users`);
    console.log(`- Removed ${removedCount} missing image references`);
    console.log(`- Total files in uploads: ${existingFiles.length}`);
    
    mongoose.disconnect();
  })
  .catch(console.error);
