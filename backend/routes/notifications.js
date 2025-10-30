const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const VoteTransaction = require('../models/VoteTransaction');
const BlurTransaction = require('../models/BlurTransaction');

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

    // ดึงการแจ้งเตือนการกดหัวใจ (จาก VoteTransaction - popularity votes)
    const likes = await VoteTransaction.find({
      candidate: userId,
      voteType: { $in: ['popularity_male', 'popularity_female'] },
      votedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .populate('voter', 'username displayName firstName lastName profileImages mainProfileImageIndex')
    .sort({ votedAt: -1 })
    .limit(10);

    // เพิ่มการแจ้งเตือนการกดหัวใจ
    likes.forEach(vote => {
      if (!vote.voter) return;
      // filter ด้วย clearedNotificationsAt
      if (clearedAt && vote.votedAt <= clearedAt) return;
      notifications.push({
        _id: `like_${vote._id}`,
        type: 'profile_like',
        title: 'คุณได้รับไลค์',
        message: `${vote.voter.displayName || vote.voter.firstName || vote.voter.username || 'Unknown User'} กดหัวใจให้คุณ ❤️`,
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

    // ดึงการแจ้งเตือนการกดดาวโหวต (จาก VoteTransaction - star votes)
    const starVotes = await VoteTransaction.find({
      candidate: userId,
      voteType: { $in: ['star_male', 'star_female'] },
      votedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .populate('voter', 'username displayName firstName lastName profileImages mainProfileImageIndex')
    .sort({ votedAt: -1 })
    .limit(10);

    // เพิ่มการแจ้งเตือนการกดดาวโหวต
    starVotes.forEach(vote => {
      if (!vote.voter) return;
      // filter ด้วย clearedNotificationsAt
      if (clearedAt && vote.votedAt <= clearedAt) return;
      notifications.push({
        _id: `star_${vote._id}`,
        type: 'profile_star',
        title: 'คุณได้รับดาว',
        message: `${vote.voter.displayName || vote.voter.firstName || vote.voter.username || 'Unknown User'} กดดาวให้คุณ ⭐`,
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

    // ดึงการแจ้งเตือนการได้รับเหรียญจากการดูภาพเบลอ
    const blurTransactions = await BlurTransaction.find({
      imageOwner: userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .populate('buyer', 'username displayName firstName lastName profileImages mainProfileImageIndex')
    .sort({ createdAt: -1 })
    .limit(10);

    // เพิ่มการแจ้งเตือนการได้รับเหรียญจากการดูภาพเบลอ
    blurTransactions.forEach(transaction => {
      if (!transaction.buyer) return;
      // filter ด้วย clearedNotificationsAt
      if (clearedAt && transaction.createdAt <= clearedAt) return;
      notifications.push({
        _id: `blur_${transaction._id}`,
        type: 'blur_payment',
        title: 'คุณได้รับเหรียญ',
        message: `${transaction.buyer.displayName || transaction.buyer.firstName || transaction.buyer.username || 'Unknown User'} จ่ายเหรียญเพื่อดูภาพของคุณ`,
        data: {
          buyerId: transaction.buyer._id,
          buyerName: transaction.buyer.displayName || transaction.buyer.firstName || transaction.buyer.username || 'Unknown User',
          buyerProfileImage: transaction.buyer.profileImages && transaction.buyer.profileImages.length > 0 ? 
            (transaction.buyer.mainProfileImageIndex !== undefined ? 
              transaction.buyer.profileImages[transaction.buyer.mainProfileImageIndex] : 
              transaction.buyer.profileImages[0]) : null,
          amount: transaction.amount || 10000,
          imageId: transaction.imageId
        },
        createdAt: transaction.createdAt,
        isRead: false
      });
    });

    // ดึงการแจ้งเตือนรางวัลจากหมุนวงล้อ (จาก User model - wheelSpinHistory)
    const userWithWheelHistory = await User.findById(userId).select('wheelSpinHistory');
    if (userWithWheelHistory && userWithWheelHistory.wheelSpinHistory && userWithWheelHistory.wheelSpinHistory.length > 0) {
      const recentSpins = userWithWheelHistory.wheelSpinHistory
        .filter(spin => new Date(spin.spunAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .sort((a, b) => new Date(b.spunAt) - new Date(a.spunAt))
        .slice(0, 10);

      recentSpins.forEach(spin => {
        // filter ด้วย clearedNotificationsAt
        if (clearedAt && new Date(spin.spunAt) <= clearedAt) return;
        
        let prizeMessage = '';
        if (spin.prizeType === 'coins') {
          prizeMessage = `คุณได้รับ ${spin.amount} เหรียญจากหมุนวงล้อ`;
        } else if (spin.prizeType === 'votePoints') {
          prizeMessage = `คุณได้รับ ${spin.amount} โหวตจากหมุนวงล้อ`;
        } else if (spin.prizeType === 'grand') {
          prizeMessage = `ยินดีด้วย! คุณได้รับรางวัลใหญ่จากหมุนวงล้อ`;
        }

        notifications.push({
          _id: `wheel_${spin._id || Date.now()}`,
          type: 'wheel_prize',
          title: 'รางวัลจากหมุนวงล้อ',
          message: prizeMessage,
          data: {
            prizeType: spin.prizeType,
            amount: spin.amount,
            spunAt: spin.spunAt
          },
          createdAt: new Date(spin.spunAt),
          isRead: false
        });
      });
    }

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

    // อัปเดตสถานะ isRead สำหรับทุกประเภทการแจ้งเตือน
    if (notificationIds && notificationIds.length > 0) {
      // สำหรับทุกประเภทการแจ้งเตือน ให้ mark เป็น read (ไม่ลบออก)
      console.log('✅ Marking notification as read:', notificationIds[0]);
      global.notifications = global.notifications?.map(n => {
        const shouldUpdate = notificationIds.includes(n._id);
        return shouldUpdate ? { ...n, isRead: true } : n;
      }) || [];
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
