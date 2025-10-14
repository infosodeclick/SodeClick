const mongoose = require('mongoose');
const StreamRoom = require('../models/StreamRoom');
require('dotenv').config();

async function stopAllStreams() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all live streams
    const liveStreams = await StreamRoom.find({ isLive: true });
    console.log(`📺 Found ${liveStreams.length} live streams`);

    if (liveStreams.length > 0) {
      // Stop all live streams
      await StreamRoom.updateMany(
        { isLive: true },
        { 
          isLive: false,
          endTime: new Date(),
          viewerCount: 0,
          viewers: []
        }
      );
      
      console.log('✅ Stopped all live streams');
    } else {
      console.log('ℹ️ No live streams found');
    }

    // Show current streams
    const allStreams = await StreamRoom.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\n📋 Recent streams:');
    allStreams.forEach(stream => {
      console.log(`- ${stream.title} (${stream.isLive ? 'LIVE' : 'Offline'}) - ${stream.streamKey}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

stopAllStreams();
