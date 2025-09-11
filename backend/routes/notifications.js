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

    // ดึงการแจ้งเตือนข้อความส่วนตัว
    const privateMessages = await Message.find({
      chatRoom: { $regex: new RegExp(`private_.*_${userId}_.*`) },
      sender: { $ne: userId },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 วันที่ผ่านมา
    })
    .populate('sender', 'username displayName firstName lastName profileImages')
    .sort({ createdAt: -1 })
    .limit(10);

    // เพิ่มการแจ้งเตือนข้อความส่วนตัว
    privateMessages.forEach(message => {
      notifications.push({
        _id: `msg_${message._id}`,
        type: 'private_message',
        data: {
          senderName: message.sender.displayName || message.sender.firstName || message.sender.username,
          messageId: message._id,
          chatRoom: message.chatRoom
        },
        createdAt: message.createdAt,
        isRead: false // ในอนาคตสามารถเพิ่ม field isRead ใน Message model ได้
      });
    });

    // ดึงการแจ้งเตือนการกดหัวใจ (จาก VoteTransaction)
    const likes = await VoteTransaction.find({
      candidate: userId,
      voteType: { $in: ['popularity_male', 'popularity_female'] },
      votedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 วันที่ผ่านมา
    })
    .populate('voter', 'username displayName firstName lastName')
    .sort({ votedAt: -1 })
    .limit(10);

    // เพิ่มการแจ้งเตือนการกดหัวใจ
    likes.forEach(vote => {
      notifications.push({
        _id: `vote_${vote._id}`,
        type: 'profile_like',
        data: {
          voterId: vote.voter._id,
          votePoints: vote.votePoints
        },
        createdAt: vote.votedAt,
        isRead: false
      });
    });

    // เรียงลำดับตามเวลาล่าสุด
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // นับจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
    unreadCount = notifications.filter(n => !n.isRead).length;

    // จำกัดจำนวนตาม pagination
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// POST /api/notifications/:userId/mark-read - ทำเครื่องหมายว่าอ่านแล้ว
router.post('/:userId/mark-read', async (req, res) => {
  try {
    const { userId } = req.params;
    const { notificationIds } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // ในอนาคตสามารถเพิ่มการอัปเดตสถานะ isRead ได้
    // ตอนนี้เราจะส่งกลับ success เพื่อให้ frontend รู้ว่าได้รับคำขอแล้ว
    
    res.json({
      success: true,
      message: 'Notifications marked as read',
      data: {
        markedCount: notificationIds ? notificationIds.length : 0
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

module.exports = router;
