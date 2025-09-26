const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const VoteTransaction = require('../models/VoteTransaction');

// GET /api/notifications/:userId - ดึงการแจ้งเตือนของผู้ใช้
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const notifications = [];
    let unreadCount = 0;

    // ดึง user เพื่อดู clearedNotificationsAt
  const userDoc = await User.findById(userId);
  const clearedAt = userDoc?.clearedNotificationsAt;

    // ดึงการแจ้งเตือนข้อความส่วนตัว
    const privateMessages = await Message.find({
      chatRoom: { $regex: new RegExp(`private_.*_${userId}_.*`) },
      sender: { $ne: userId },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .populate('sender', 'username displayName firstName lastName profileImages mainProfileImageIndex')
    .sort({ createdAt: -1 })
    .limit(10);

    // เพิ่มการแจ้งเตือนข้อความส่วนตัว
    privateMessages.forEach(message => {
      if (!message.sender) return;
      // filter ด้วย clearedNotificationsAt
      if (clearedAt && message.createdAt <= clearedAt) return;
      notifications.push({
        _id: `msg_${message._id}`,
        type: 'private_message',
        title: 'ข้อความใหม่',
        message: `${message.sender.displayName || message.sender.firstName || message.sender.username || 'Unknown User'} ส่งข้อความมา`,
        data: {
          senderId: message.sender._id,
          senderName: message.sender.displayName || message.sender.firstName || message.sender.username || 'Unknown User',
          senderProfileImage: message.sender.profileImages && message.sender.profileImages.length > 0 ? 
            (message.sender.mainProfileImageIndex !== undefined ? 
              message.sender.profileImages[message.sender.mainProfileImageIndex] : 
              message.sender.profileImages[0]) : null,
          messageId: message._id,
          chatRoom: message.chatRoom,
          messageContent: message.content || message.text || ''
        },
        createdAt: message.createdAt,
        isRead: false
      });
    });

    // ดึงการแจ้งเตือนการกดหัวใจ (จาก VoteTransaction)
    const likes = await VoteTransaction.find({
      candidate: userId,
      voteType: { $in: ['popularity_male', 'popularity_female'] },
      votedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .populate('voter', 'username displayName firstName lastName')
    .sort({ votedAt: -1 })
    .limit(10);

    // เพิ่มการแจ้งเตือนการกดหัวใจ
    likes.forEach(vote => {
      if (!vote.voter) return;
      // filter ด้วย clearedNotificationsAt
      if (clearedAt && vote.votedAt <= clearedAt) return;
      notifications.push({
        _id: `vote_${vote._id}`,
        type: 'profile_like',
        title: 'คุณได้รับโหวด',
        message: 'คุณได้รับ ❤️',
        data: {
          voterId: vote.voter._id,
          voterName: vote.voter.displayName || vote.voter.firstName || vote.voter.username || 'Unknown User',
          voterProfileImage: vote.voter.profileImages && vote.voter.profileImages.length > 0 ? 
            (vote.voter.mainProfileImageIndex !== undefined ? 
              vote.voter.profileImages[vote.voter.mainProfileImageIndex] : 
              vote.voter.profileImages[0]) : null,
          votePoints: vote.votePoints || 1,
          voteType: vote.voteType
        },
        createdAt: vote.votedAt,
        isRead: false
      });
    });

    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    unreadCount = notifications.filter(n => !n.isRead).length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = notifications.slice(startIndex, endIndex);
    res.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        unreadCount,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          total: notifications.length,
          hasMore: endIndex < notifications.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/notifications/:userId/mark-read - ทำเครื่องหมายว่าอ่านแล้ว
router.post('/:userId/mark-read', async (req, res) => {
  try {
    const { userId } = req.params;
    const { notificationIds, notificationType } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // อัปเดตสถานะ isRead หรือลบแจ้งเตือน
    if (notificationIds && notificationIds.length > 0) {
      if (notificationType === 'private_message') {
        // ถ้าเป็นแชทข้อความ ให้ลบออกจาก memory
        console.log('🗑️ Removing chat notification:', notificationIds[0]);
        global.notifications = global.notifications?.filter(n => 
          !notificationIds.includes(n._id)
        ) || [];
      } else {
        // ถ้าเป็นแจ้งเตือนอื่นๆ ให้ mark เป็น read
        console.log('✅ Marking notification as read:', notificationIds[0]);
        global.notifications = global.notifications?.map(n => {
          const shouldUpdate = notificationIds.includes(n._id);
          return shouldUpdate ? { ...n, isRead: true } : n;
        }) || [];
      }
    }
    
    res.json({
      success: true,
      message: 'Notifications processed successfully',
      data: {
        processedCount: notificationIds ? notificationIds.length : 0
      }
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
});

// DELETE /api/notifications/:userId/clear - ล้างการแจ้งเตือนทั้งหมด
router.delete('/:userId/clear', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // อัปเดตเวลาล้างแจ้งเตือนล่าสุดใน user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    user.clearedNotificationsAt = new Date();
    await user.save();
    console.log('🗑️ Set clearedNotificationsAt for user:', userId);
    res.json({
      success: true,
      message: 'All notifications cleared successfully',
      data: {
        clearedAt: user.clearedNotificationsAt
      }
    });

  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications',
      error: error.message
    });
  }
});

module.exports = router;
