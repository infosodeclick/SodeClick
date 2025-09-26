const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb+srv://shayetet14:sdg5NrhmPFak8T3y@cluster0.2g7xxjp.mongodb.net/sodeclick?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find users with profile images
    const users = await User.find({ 
      profileImages: { $exists: true, $ne: [] } 
    });
    
    console.log(`Found ${users.length} users with profile images`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      let hasChanges = false;
      const newProfileImages = [];
      
      for (const imageUrl of user.profileImages) {
        let newUrl = imageUrl;
        
        // Fix localhost URLs to production URLs
        if (imageUrl.includes('localhost:5000')) {
          newUrl = imageUrl.replace('http://localhost:5000', 'https://sodeclick-backend-production.up.railway.app');
          hasChanges = true;
          console.log(`Fixed localhost URL for user ${user.username}: ${imageUrl} -> ${newUrl}`);
        }
        
        // Fix HTTP URLs to HTTPS for production
        if (imageUrl.includes('http://sodeclick-backend-production.up.railway.app')) {
          newUrl = imageUrl.replace('http://', 'https://');
          hasChanges = true;
          console.log(`Fixed HTTP to HTTPS for user ${user.username}: ${imageUrl} -> ${newUrl}`);
        }
        
        newProfileImages.push(newUrl);
      }
      
      if (hasChanges) {
        user.profileImages = newProfileImages;
        await user.save();
        updatedCount++;
        console.log(`Updated user: ${user.username}`);
      }
    }
    
    console.log(`Updated ${updatedCount} users`);
    mongoose.disconnect();
  })
  .catch(console.error);
