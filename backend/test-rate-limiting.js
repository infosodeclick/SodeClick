#!/usr/bin/env node

/**
 * Test script for rate limiting functionality
 * This script tests the rate limiting behavior in Socket.IO
 */

const io = require('socket.io-client');

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

const SERVER_URL = 'http://localhost:5000'; // ใช้ backend port โดยตรง

async function testRateLimiting() {
  console.log('🧪 Testing Socket.IO Rate Limiting');
  console.log('🔌 Connecting to server:', SERVER_URL);

  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    timeout: 10000,
    reconnection: false
  });

  return new Promise((resolve, reject) => {
    let connected = false;
    let errorCount = 0;
    let successCount = 0;

    socket.on('connect', () => {
      console.log('✅ Connected to server:', socket.id);
      connected = true;

      // Test rapid join-room requests
      console.log('\n🔥 Testing rapid join-room requests...');
      
      const testRoomId = 'private_test_user1_user2';
      const testUserId = 'test_user_id';
      const testToken = 'test_token';

      // Send 5 rapid requests
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          console.log(`📤 Sending join-room request #${i + 1}`);
          socket.emit('join-room', {
            roomId: testRoomId,
            userId: testUserId,
            token: testToken
          });
        }, i * 100); // 100ms apart
      }

      // Close connection after test
      setTimeout(() => {
        console.log('\n📊 Test Results:');
        console.log(`✅ Successful joins: ${successCount}`);
        console.log(`❌ Rate limited: ${errorCount}`);
        
        if (errorCount > 0) {
          console.log('✅ Rate limiting is working correctly!');
        } else {
          console.log('⚠️ No rate limiting detected - check server configuration');
        }

        socket.disconnect();
        resolve({ successCount, errorCount });
      }, 2000);
    });

    socket.on('error', (error) => {
      console.log('❌ Received error:', error.message);
      if (error.message.includes('Rate limit')) {
        errorCount++;
        console.log(`⏱️ Rate limit hit (${errorCount} times)`);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      if (!connected) {
        reject(error);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!connected) {
        console.error('❌ Connection timeout');
        reject(new Error('Connection timeout'));
      }
    }, 10000);
  });
}

// Run the test
if (require.main === module) {
  testRateLimiting()
    .then((results) => {
      console.log('\n🎉 Rate limiting test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testRateLimiting;
