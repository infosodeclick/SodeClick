const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/users - ดึงรายการผู้ใช้ทั้งหมด
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching all users...');
    const users = await User.find({ isActive: true })
      .select('username displayName isOnline lastSeen membershipTier')
      .lean();

    console.log(`✅ Found ${users.length} users`);

    res.json({
      success: true,
      data: {
        users,
        total: users.length,
        onlineCount: users.filter(u => u.isOnline).length
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// GET /api/users/online-count - ดึงจำนวนคนออนไลน์รวมในระบบ
router.get('/online-count', async (req, res) => {
  try {
    console.log('🔍 Fetching total active users count...');
    
    // นับจำนวนผู้ใช้ที่ออนไลน์จาก isOnline field
    const onlineCount = await User.countDocuments({ 
      isOnline: true,
      isActive: true
    });
    
    console.log(`✅ Total active users: ${onlineCount}`);

    res.json({
      success: true,
      data: {
        onlineCount,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching online count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch online count',
      error: error.message
    });
  }
});

// GET /api/users/online-status - ดึงข้อมูลผู้ใช้ที่ออนไลน์ล่าสุด
router.get('/online-status', async (req, res) => {
  try {
    console.log('🔍 Fetching online users status...');
    
    // ดึงข้อมูลผู้ใช้ที่ออนไลน์ตาม isOnline field เท่านั้น (ไม่ตรวจสอบ lastActive)
    const onlineUsers = await User.find({ 
      isOnline: true,
      isActive: true
      // ไม่ตรวจสอบ lastActive - ให้ online คงอยู่จนกว่าจะ logout หรือออกจากแอป
    })
    .select('_id username displayName isOnline lastActive membershipTier profileImages')
    .lean();
    
    console.log(`✅ Found ${onlineUsers.length} online users`);
    
    // Debug: แสดงข้อมูลผู้ใช้ที่ออนไลน์
    if (onlineUsers.length > 0) {
      console.log('🟢 Online users:', onlineUsers.map(u => ({
        id: u._id,
        username: u.username || u.displayName,
        lastActive: u.lastActive,
        isOnline: u.isOnline
      })));
    } else {
      // Debug: ตรวจสอบว่ามีใครที่มี isOnline = true บ้าง
      const allOnlineUsers = await User.find({ isOnline: true, isActive: true })
        .select('_id username displayName isOnline lastActive')
        .lean();
      console.log(`🔍 Total users with isOnline=true: ${allOnlineUsers.length}`);
      if (allOnlineUsers.length > 0) {
        console.log('📋 Users with isOnline=true:', allOnlineUsers.map(u => ({
          id: u._id,
          username: u.username || u.displayName,
          lastActive: u.lastActive,
          isOnline: u.isOnline
        })));
      }
    }

    res.json({
      success: true,
      data: {
        onlineUsers,
        onlineCount: onlineUsers.length,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching online status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch online status',
      error: error.message
    });
  }
});

module.exports = router;
