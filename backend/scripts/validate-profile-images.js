const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Import User model
const User = require('../models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://shayetet14:sdg5NrhmPFak8T3y@cluster0.2g7xxjp.mongodb.net/sodeclick?retryWrites=true&w=majority&appName=Cluster0';

async function validateProfileImages() {
  try {
    console.log('🔍 Starting profile image validation...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all users with profile images
    const users = await User.find({ 
      profileImages: { $exists: true, $ne: [] }
    });
    
    console.log(`📊 Found ${users.length} users with profile images`);
    
    let totalImages = 0;
    let validImages = 0;
    let invalidImages = 0;
    let missingFiles = 0;
    
    for (const user of users) {
      console.log(`\n👤 Validating user: ${user._id} (${user.username || user.email})`);
      
      for (let i = 0; i < user.profileImages.length; i++) {
        const imagePath = user.profileImages[i];
        totalImages++;
        
        // Skip default avatars
        if (imagePath.startsWith('data:image/svg+xml')) {
          console.log(`✅ Default avatar: ${imagePath}`);
          validImages++;
          continue;
        }
        
        // Check file existence
        const fullPath = path.join(__dirname, '..', 'uploads', imagePath);
        
        if (fs.existsSync(fullPath)) {
          // Check file size
          const stats = fs.statSync(fullPath);
          const fileSizeKB = Math.round(stats.size / 1024);
          
          if (fileSizeKB > 0) {
            console.log(`✅ Valid: ${imagePath} (${fileSizeKB}KB)`);
            validImages++;
          } else {
            console.log(`❌ Empty file: ${imagePath}`);
            invalidImages++;
          }
        } else {
          console.log(`❌ Missing file: ${imagePath}`);
          missingFiles++;
          invalidImages++;
        }
      }
    }
    
    console.log(`\n📊 Validation Results:`);
    console.log(`📈 Total images checked: ${totalImages}`);
    console.log(`✅ Valid images: ${validImages}`);
    console.log(`❌ Invalid images: ${invalidImages}`);
    console.log(`📁 Missing files: ${missingFiles}`);
    
    // Check directory structure
    console.log(`\n📁 Directory Structure Check:`);
    const usersDir = path.join(__dirname, '..', 'uploads', 'users');
    
    if (fs.existsSync(usersDir)) {
      const userDirs = fs.readdirSync(usersDir).filter(item => 
        fs.statSync(path.join(usersDir, item)).isDirectory()
      );
      console.log(`📂 User directories: ${userDirs.length}`);
      
      for (const userDir of userDirs) {
        const userPath = path.join(usersDir, userDir);
        const files = fs.readdirSync(userPath);
        console.log(`  👤 ${userDir}: ${files.length} files`);
      }
    } else {
      console.log(`❌ Users directory not found: ${usersDir}`);
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run validation
validateProfileImages();
