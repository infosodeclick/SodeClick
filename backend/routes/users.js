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
    console.log('🔍 Fetching total active users count across all chat rooms...');
    
    // คำนวณจำนวนคนออนไลน์ที่ใช้งานจริงในทุกห้องแชท (มีการส่งข้อความใน 30 นาทีล่าสุด)
    const Message = require('../models/Message');
    const ChatRoom = require('../models/ChatRoom');
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // นับจำนวนผู้ใช้ที่ไม่ซ้ำกันที่ส่งข้อความในทุกห้องในช่วง 30 นาทีล่าสุด
    const activeUsers = await Message.distinct('sender', {
      createdAt: { $gte: thirtyMinutesAgo },
      isDeleted: { $ne: true }
    });
    
    const onlineCount = activeUsers.length;
    console.log(`✅ Total active users across all chat rooms: ${onlineCount}`);

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

module.exports = router;
