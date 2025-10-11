/**
 * Migration Script: Migrate Existing Private Chats to User.privateChats Array
 * 
 * This script finds all existing private chat messages and adds the chat information
 * to both users' privateChats array in the User model.
 * 
 * Usage: node scripts/migrate-existing-chats.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

async function migrateExistingChats() {
  try {
    console.log(`${colors.blue}🚀 Starting migration of existing private chats...${colors.reset}\n`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}\n`);

    // Find all private chat messages
    const privateMessages = await Message.find({
      chatRoom: { $regex: /^private_.*_/ }
    })
    .distinct('chatRoom')
    .lean();

    console.log(`${colors.blue}📊 Found ${privateMessages.length} unique private chats${colors.reset}\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const chatRoom of privateMessages) {
      try {
        // Parse chat room ID to get user IDs
        const parts = chatRoom.replace('private_', '').split('_');
        
        if (parts.length !== 2) {
          console.log(`${colors.yellow}⚠️  Skipping invalid chat room format: ${chatRoom}${colors.reset}`);
          skippedCount++;
          continue;
        }

        const [userId1, userId2] = parts;

        // Validate that both users exist
        const [user1, user2] = await Promise.all([
          User.findById(userId1),
          User.findById(userId2)
        ]);

        if (!user1 || !user2) {
          console.log(`${colors.yellow}⚠️  Skipping chat ${chatRoom}: One or both users not found${colors.reset}`);
          skippedCount++;
          continue;
        }

        // Check if chat already exists in user1's privateChats
        const user1HasChat = user1.privateChats && user1.privateChats.some(
          chat => chat.chatId === chatRoom
        );

        // Check if chat already exists in user2's privateChats
        const user2HasChat = user2.privateChats && user2.privateChats.some(
          chat => chat.chatId === chatRoom
        );

        let addedToUser1 = false;
        let addedToUser2 = false;

        // Add to user1 if not exists
        if (!user1HasChat) {
          await User.findByIdAndUpdate(userId1, {
            $push: {
              privateChats: {
                chatId: chatRoom,
                otherUserId: userId2,
                createdAt: new Date(),
                isDeleted: false
              }
            }
          });
          addedToUser1 = true;
        }

        // Add to user2 if not exists
        if (!user2HasChat) {
          await User.findByIdAndUpdate(userId2, {
            $push: {
              privateChats: {
                chatId: chatRoom,
                otherUserId: userId1,
                createdAt: new Date(),
                isDeleted: false
              }
            }
          });
          addedToUser2 = true;
        }

        if (addedToUser1 || addedToUser2) {
          migratedCount++;
          const user1Name = user1.displayName || user1.username;
          const user2Name = user2.displayName || user2.username;
          console.log(
            `${colors.green}✅ Migrated chat: ${user1Name} ↔ ${user2Name}${colors.reset} ` +
            `(Added to: ${addedToUser1 ? 'User1' : ''}${addedToUser1 && addedToUser2 ? ', ' : ''}${addedToUser2 ? 'User2' : ''})`
          );
        } else {
          skippedCount++;
          console.log(`${colors.yellow}⚠️  Chat already exists in both users' arrays: ${chatRoom}${colors.reset}`);
        }

      } catch (error) {
        errorCount++;
        console.error(`${colors.red}❌ Error migrating chat ${chatRoom}:${colors.reset}`, error.message);
      }
    }

    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.green}✅ Migration completed!${colors.reset}\n`);
    console.log(`${colors.blue}📊 Summary:${colors.reset}`);
    console.log(`   • Total chats found: ${privateMessages.length}`);
    console.log(`   • Successfully migrated: ${colors.green}${migratedCount}${colors.reset}`);
    console.log(`   • Skipped (already exists): ${colors.yellow}${skippedCount}${colors.reset}`);
    console.log(`   • Errors: ${colors.red}${errorCount}${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}❌ Fatal error during migration:${colors.reset}`, error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log(`${colors.blue}🔌 MongoDB connection closed${colors.reset}`);
  }
}

// Run the migration
migrateExistingChats().catch(console.error);

