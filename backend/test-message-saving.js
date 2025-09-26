#!/usr/bin/env node

/**
 * Test script for message saving functionality
 * This script tests if messages are being saved to the database correctly
 */

const mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');

// Load environment variables
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const NODE_ENV = process.env.NODE_ENV || 'development';
const envPath = path.join(__dirname, '.env');
const envSpecificPath = path.join(__dirname, `env.${NODE_ENV}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(envSpecificPath)) {
  dotenv.config({ path: envSpecificPath });
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';

async function testMessageSaving() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // ดึงผู้ใช้สำหรับทดสอบ
    const users = await User.find().limit(2);
    if (users.length < 2) {
      console.error('❌ Need at least 2 users in database for testing');
      process.exit(1);
    }

    const user1 = users[0];
    const user2 = users[1];
    console.log(`👤 Using users: ${user1.username} and ${user2.username}`);

    // สร้าง private chat ID
    const sortedUserIds = [user1._id.toString(), user2._id.toString()].sort();
    const privateChatId = `private_${sortedUserIds[0]}_${sortedUserIds[1]}`;
    console.log(`🔒 Testing private chat: ${privateChatId}`);

    // ลบข้อความทดสอบเก่า (ถ้ามี)
    await Message.deleteMany({ 
      chatRoom: privateChatId,
      content: { $regex: /^TEST MESSAGE/ }
    });

    // สร้างข้อความทดสอบ
    const testMessage = new Message({
      content: `TEST MESSAGE - ${new Date().toISOString()}`,
      sender: user1._id,
      chatRoom: privateChatId,
      messageType: 'text'
    });

    console.log('💾 Saving test message...');
    await testMessage.save();
    console.log('✅ Test message saved successfully:', testMessage._id);

    // ตรวจสอบว่าข้อความถูกบันทึกจริง
    const savedMessage = await Message.findById(testMessage._id)
      .populate('sender', 'username displayName');
    
    if (savedMessage) {
      console.log('✅ Message verification successful:');
      console.log(`   ID: ${savedMessage._id}`);
      console.log(`   Content: ${savedMessage.content}`);
      console.log(`   Sender: ${savedMessage.sender.username}`);
      console.log(`   Chat Room: ${savedMessage.chatRoom}`);
      console.log(`   Created: ${savedMessage.createdAt}`);
    } else {
      console.error('❌ Message not found in database after saving');
    }

    // ดึงข้อความทั้งหมดใน private chat นี้
    const allMessages = await Message.find({ chatRoom: privateChatId })
      .populate('sender', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`📊 Total messages in chat: ${allMessages.length}`);
    allMessages.forEach((msg, index) => {
      console.log(`   ${index + 1}. [${msg.createdAt.toISOString()}] ${msg.sender.username}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
    });

    // ทดสอบการดึงข้อความผ่าน API method
    console.log('\n🔍 Testing message retrieval...');
    const retrievedMessages = await Message.find({ 
      chatRoom: privateChatId,
      isDeleted: false 
    })
    .populate('sender', 'username displayName membership membershipTier profileImages')
    .populate('replyTo', 'content sender')
    .populate('reactions.user', 'username displayName')
    .sort({ createdAt: -1 })
    .limit(30);

    console.log(`✅ Retrieved ${retrievedMessages.length} messages successfully`);

    // ลบข้อความทดสอบ
    await Message.findByIdAndDelete(testMessage._id);
    console.log('🧹 Test message cleaned up');

    console.log('\n🎉 All tests passed! Message saving is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the test
if (require.main === module) {
  testMessageSaving().then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = testMessageSaving;
