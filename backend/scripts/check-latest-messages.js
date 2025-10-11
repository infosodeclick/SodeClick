const mongoose = require('mongoose');
const Message = require('../models/Message');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sodeclick', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkLatestMessages() {
  try {
    console.log('🔍 Checking latest messages for duplicates...');
    
    // Get the 10 most recent messages
    const recentMessages = await Message.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('sender', 'username displayName')
      .lean();
    
    console.log(`📊 Found ${recentMessages.length} recent messages:`);
    
    recentMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ID: ${msg._id}`);
      console.log(`   Content: ${msg.content?.substring(0, 50)}...`);
      console.log(`   Sender: ${msg.sender?.displayName || msg.sender?.username}`);
      console.log(`   Chat Room: ${msg.chatRoom}`);
      console.log(`   Created: ${msg.createdAt}`);
      console.log('   ---');
    });
    
    // Check for duplicates by content and chatRoom
    const duplicates = await Message.aggregate([
      {
        $group: {
          _id: { content: "$content", chatRoom: "$chatRoom" },
          count: { $sum: 1 },
          messages: { $push: { id: "$_id", createdAt: "$createdAt", sender: "$sender" } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);
    
    if (duplicates.length > 0) {
      console.log(`❌ Found ${duplicates.length} duplicate message groups:`);
      duplicates.forEach((dup, index) => {
        console.log(`${index + 1}. Content: "${dup._id.content}"`);
        console.log(`   Chat Room: ${dup._id.chatRoom}`);
        console.log(`   Count: ${dup.count}`);
        dup.messages.forEach(msg => {
          console.log(`   - ID: ${msg.id}, Created: ${msg.createdAt}`);
        });
        console.log('   ---');
      });
    } else {
      console.log('✅ No duplicate messages found!');
    }
    
  } catch (error) {
    console.error('❌ Error checking messages:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkLatestMessages();
