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
    
    // Find test users
    const testUsers = [
      { id: '68c1a0161e160138d0321692', username: 'tanachokl' },
      { id: '68c2f1cd533412ccc176c98f', username: '0885599334' }
    ];
    
    for (const testUser of testUsers) {
      console.log(`\n🔍 Fixing user: ${testUser.username} (${testUser.id})`);
      
      const user = await User.findById(testUser.id);
      if (!user) {
        console.log('❌ User not found');
        continue;
      }
      
      // Find files for this user
      const userFiles = existingFiles.filter(file => file.includes(testUser.id));
      console.log(`Found ${userFiles.length} files for user:`, userFiles);
      
      if (userFiles.length > 0) {
        // Create new profile images array with actual files
        const newProfileImages = userFiles.map(file => {
          // Use production URL for now
          return `https://sodeclick-backend-production.up.railway.app/uploads/profiles/${file}`;
        });
        
        console.log('New profile images:', newProfileImages);
        
        // Update user
        user.profileImages = newProfileImages;
        await user.save();
        
        console.log(`✅ Updated user ${testUser.username} with ${newProfileImages.length} images`);
      } else {
        console.log(`❌ No files found for user ${testUser.username}`);
      }
    }
    
    mongoose.disconnect();
  })
  .catch(console.error);
