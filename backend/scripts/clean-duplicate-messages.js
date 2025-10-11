/**
 * Script: Clean Duplicate Messages in Database
 * 
 * This script finds and removes duplicate messages in the database
 * that may have been created due to the previous bug.
 * 
 * Usage: node scripts/clean-duplicate-messages.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Message = require('../models/Message');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

async function cleanDuplicateMessages() {
  try {
    console.log(`${colors.blue}🧹 Starting duplicate message cleanup...${colors.reset}\n`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}\n`);

    // Find all private chat messages
    const privateMessages = await Message.find({
      chatRoom: { $regex: /^private_.*_/ }
    }).sort({ chatRoom: 1, createdAt: 1 });

    console.log(`${colors.blue}📊 Found ${privateMessages.length} private chat messages${colors.reset}\n`);

    let totalDuplicates = 0;
    let cleanedRooms = 0;

    // Group messages by chatRoom
    const messagesByRoom = {};
    privateMessages.forEach(msg => {
      if (!messagesByRoom[msg.chatRoom]) {
        messagesByRoom[msg.chatRoom] = [];
      }
      messagesByRoom[msg.chatRoom].push(msg);
    });

    console.log(`${colors.blue}📊 Found ${Object.keys(messagesByRoom).length} private chat rooms${colors.reset}\n`);

    for (const [chatRoom, messages] of Object.entries(messagesByRoom)) {
      console.log(`${colors.blue}🔍 Processing chat room: ${chatRoom} (${messages.length} messages)${colors.reset}`);
      
      // Find duplicates based on content, sender, and time proximity (within 1 second)
      const duplicates = [];
      const seen = new Set();
      
      for (let i = 0; i < messages.length; i++) {
        const msg1 = messages[i];
        
        for (let j = i + 1; j < messages.length; j++) {
          const msg2 = messages[j];
          
          // Check if messages are duplicates
          const isDuplicate = 
            msg1.content === msg2.content &&
            msg1.sender.toString() === msg2.sender.toString() &&
            Math.abs(new Date(msg1.createdAt) - new Date(msg2.createdAt)) < 1000; // Within 1 second
          
          if (isDuplicate && !seen.has(msg2._id.toString())) {
            duplicates.push(msg2._id);
            seen.add(msg2._id.toString());
            console.log(`${colors.yellow}⚠️  Found duplicate message: ${msg2._id} (content: "${msg2.content?.substring(0, 30)}...")${colors.reset}`);
          }
        }
      }
      
      if (duplicates.length > 0) {
        console.log(`${colors.yellow}🗑️  Removing ${duplicates.length} duplicate messages from ${chatRoom}${colors.reset}`);
        
        // Delete duplicate messages
        const result = await Message.deleteMany({
          _id: { $in: duplicates }
        });
        
        console.log(`${colors.green}✅ Deleted ${result.deletedCount} duplicate messages${colors.reset}`);
        totalDuplicates += result.deletedCount;
        cleanedRooms++;
      } else {
        console.log(`${colors.green}✅ No duplicates found in ${chatRoom}${colors.reset}`);
      }
      
      console.log(''); // Empty line for readability
    }

    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.green}✅ Cleanup completed!${colors.reset}\n`);
    console.log(`${colors.blue}📊 Summary:${colors.reset}`);
    console.log(`   • Chat rooms processed: ${Object.keys(messagesByRoom).length}`);
    console.log(`   • Chat rooms with duplicates: ${colors.yellow}${cleanedRooms}${colors.reset}`);
    console.log(`   • Total duplicate messages removed: ${colors.red}${totalDuplicates}${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}❌ Fatal error during cleanup:${colors.reset}`, error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log(`${colors.blue}🔌 MongoDB connection closed${colors.reset}`);
  }
}

// Run the cleanup
cleanDuplicateMessages().catch(console.error);
