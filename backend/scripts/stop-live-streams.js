const mongoose = require('mongoose');
const StreamRoom = require('../models/StreamRoom');

// Load environment
require('dotenv').config({ path: '.env' });

async function stopLiveStreams() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find and stop all live streams
    const result = await StreamRoom.updateMany(
      { isLive: true },
      { 
        $set: { 
          isLive: false,
          viewerCount: 0,
          viewers: [],
          endTime: new Date()
        }
      }
    );
    
    console.log(`✅ Stopped ${result.modifiedCount} live streams`);

    // Show current streams
    const streams = await StreamRoom.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\n📋 Recent streams:');
    streams.forEach(s => {
      console.log(`- ${s.title}: ${s.isLive ? 'LIVE ✅' : 'Offline ⭕'} (${s.streamKey})`);
    });

    await mongoose.disconnect();
    console.log('\n👋 Done! You can now create new streams.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

stopLiveStreams();
