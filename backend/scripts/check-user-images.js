const mongoose = require('mongoose');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect('mongodb+srv://shayetet14:sdg5NrhmPFak8T3y@cluster0.2g7xxjp.mongodb.net/sodeclick?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check specific users
    const userIds = [
      '68c1a0161e160138d0321692', // tanachokl
      '68c2f1cd533412ccc176c98f'  // 0885599334
    ];
    
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
    const existingFiles = fs.readdirSync(uploadsDir);
    
    for (const userId of userIds) {
      console.log(`\n🔍 Checking user: ${userId}`);
      
      const user = await User.findById(userId);
      if (!user) {
        console.log('❌ User not found');
        continue;
      }
      
      console.log(`Username: ${user.username}`);
      console.log(`Profile images count: ${user.profileImages?.length || 0}`);
      
      if (user.profileImages && user.profileImages.length > 0) {
        console.log('Profile images:');
        user.profileImages.forEach((imageUrl, index) => {
          console.log(`  ${index + 1}. ${imageUrl}`);
          
          // Extract filename
          let filename = '';
          if (imageUrl.includes('/uploads/profiles/')) {
            filename = imageUrl.split('/uploads/profiles/')[1];
          } else if (imageUrl.includes('profile-')) {
            const urlParts = imageUrl.split('/');
            filename = urlParts[urlParts.length - 1];
          }
          
          if (filename) {
            const fileExists = existingFiles.includes(filename);
            console.log(`     File: ${filename} - ${fileExists ? '✅ EXISTS' : '❌ MISSING'}`);
          }
        });
      }
    }
    
    console.log(`\n📁 Total files in uploads directory: ${existingFiles.length}`);
    console.log('Files:');
    existingFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
    
    mongoose.disconnect();
  })
  .catch(console.error);
