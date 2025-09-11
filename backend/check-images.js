const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb+srv://shayetet14:sdg5NrhmPFak8T3y@cluster0.2g7xxjp.mongodb.net/sodeclick?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find users with profile images
    const users = await User.find({ 
      profileImages: { $exists: true, $ne: [] } 
    }).select('username profileImages').limit(5);
    
    console.log('Users with profile images:');
    users.forEach(user => {
      console.log('User:', user.username);
      console.log('Images count:', user.profileImages.length);
      console.log('Images:', user.profileImages);
      console.log('---');
    });
    
    // Check if any images are accessible
    if (users.length > 0 && users[0].profileImages.length > 0) {
      const firstImage = users[0].profileImages[0];
      console.log('Testing first image URL:', firstImage);
      
      // Test if image URL is valid
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = url.parse(firstImage);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.path,
        method: 'HEAD'
      };
      
      const req = http.request(options, (res) => {
        console.log('Image accessibility test:');
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);
      });
      
      req.on('error', (err) => {
        console.log('Image accessibility test failed:', err.message);
      });
      
      req.end();
    }
    
    mongoose.disconnect();
  })
  .catch(console.error);
