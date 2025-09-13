const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');

// POST /api/upgrade-simple - อัพเกรดแบบง่าย
router.post('/', async (req, res) => {
  try {
    const { userId, tier, paymentMethod, transactionId, amount, currency } = req.body;
    
    if (!userId || !tier || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // หา user และ plan
    const [user, plan] = await Promise.all([
      User.findById(userId),
      MembershipPlan.findOne({ tier, isActive: true })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    // คำนวณวันหมดอายุ
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (plan.duration.days * 24 * 60 * 60 * 1000));

    // อัพเดตโดยใช้ findByIdAndUpdate
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'membership.tier': plan.tier,
          'membership.startDate': startDate,
          'membership.endDate': tier === 'member' ? null : endDate,
          'membership.autoRenew': false,
          'membership.planId': plan._id,
          'coins': (user.coins || 0) + (plan.features.bonusCoins || 0),
          'dailyUsage.chatCount': 0,
          'dailyUsage.imageUploadCount': 0,
          'dailyUsage.videoUploadCount': 0,
          'dailyUsage.lastReset': new Date()
        }
      },
      { new: true, runValidators: false } // ปิด validators เพื่อหลีกเลี่ยง pre-save hooks
    );

    // ส่ง Socket.IO event สำหรับอัพเดท membership แบบ real-time
    const io = req.app.get('io');
    if (io) {
      // อัพเดทข้อความเก่า
      const Message = require('../models/Message');
      await Message.updateMany(
        { 'sender': userId },
        { $set: { 'sender.membershipTier': tier } }
      );

      // ส่ง event ไปยังห้องแชทที่ผู้ใช้นี้อยู่
      io.emit('membership-updated', {
        userId,
        newTier: tier,
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          membershipTier: tier,
          profileImages: updatedUser.profileImages
        }
      });
      
      console.log(`🔄 Emitted membership update for user ${userId} to ${tier}`);
    }

    res.json({
      success: true,
      message: 'Membership upgraded successfully',
      data: {
        tier: updatedUser.membership.tier,
        startDate: updatedUser.membership.startDate,
        endDate: updatedUser.membership.endDate,
        bonusCoinsAdded: plan.features.bonusCoins || 0,
        newCoinBalance: updatedUser.coins,
        transactionId
      }
    });

  } catch (error) {
    console.error('Error upgrading membership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade membership',
      error: error.message
    });
  }
});

module.exports = router;
