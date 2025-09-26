const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Import User model
const User = require('./models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://shayetet14:sdg5NrhmPFak8T3y@cluster0.2g7xxjp.mongodb.net/sodeclick?retryWrites=true&w=majority&appName=Cluster0';

async function migrateProfileImages() {
  try {
    console.log('🚀 Starting profile image migration...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all users with profile images
    const users = await User.find({ 
      profileImages: { $exists: true, $ne: [] },
      profileImages: { $not: { $all: [{ $regex: /^data:image\/svg\+xml/ }] } }
    });
    
    console.log(`📊 Found ${users.length} users with profile images`);
    
    let totalMoved = 0;
    let totalErrors = 0;
    
    for (const user of users) {
      console.log(`\n👤 Processing user: ${user._id} (${user.username || user.email})`);
      
      const newProfileImages = [];
      let userMovedCount = 0;
      
      for (let i = 0; i < user.profileImages.length; i++) {
        const imagePath = user.profileImages[i];
        
        // Skip default avatars
        if (imagePath.startsWith('data:image/svg+xml')) {
          newProfileImages.push(imagePath);
          continue;
        }
        
        // Check if it's an old path format
        if (imagePath.includes('profile-') && !imagePath.startsWith('users/')) {
          const oldFilePath = path.join(__dirname, 'uploads', 'profiles', imagePath);
          const newUserDir = path.join(__dirname, 'uploads', 'users', user._id.toString());
          const newFilePath = path.join(newUserDir, imagePath);
          
          // Create user directory if it doesn't exist
          if (!fs.existsSync(newUserDir)) {
            fs.mkdirSync(newUserDir, { recursive: true });
            console.log(`📁 Created directory: ${newUserDir}`);
          }
          
          // Check if old file exists
          if (fs.existsSync(oldFilePath)) {
            try {
              // Move file
              fs.copyFileSync(oldFilePath, newFilePath);
              console.log(`✅ Moved: ${imagePath} -> users/${user._id}/${imagePath}`);
              
              // Update path in database
              const newPath = `users/${user._id}/${imagePath}`;
              newProfileImages.push(newPath);
              userMovedCount++;
              totalMoved++;
              
              // Delete old file
              fs.unlinkSync(oldFilePath);
              console.log(`🗑️ Deleted old file: ${oldFilePath}`);
              
            } catch (error) {
              console.error(`❌ Error moving ${imagePath}:`, error.message);
              newProfileImages.push(imagePath); // Keep original path
              totalErrors++;
            }
          } else {
            console.log(`⚠️ File not found: ${oldFilePath}`);
            newProfileImages.push(imagePath); // Keep original path
            totalErrors++;
          }
        } else {
          // Already in new format or other format
          newProfileImages.push(imagePath);
        }
      }
      
      // Update user in database
      if (userMovedCount > 0) {
        await User.findByIdAndUpdate(user._id, { 
          profileImages: newProfileImages 
        });
        console.log(`💾 Updated database for user ${user._id} (${userMovedCount} images moved)`);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Total images moved: ${totalMoved}`);
    console.log(`❌ Total errors: ${totalErrors}`);
    
    // Clean up empty profiles directory
    const profilesDir = path.join(__dirname, 'uploads', 'profiles');
    const remainingFiles = fs.readdirSync(profilesDir).filter(file => 
      !file.startsWith('.') && file !== '.gitkeep'
    );
    
    if (remainingFiles.length === 0) {
      console.log('🧹 Profiles directory is empty, keeping .gitkeep file');
    } else {
      console.log(`⚠️ ${remainingFiles.length} files still in profiles directory:`, remainingFiles);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateProfileImages();
