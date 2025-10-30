const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');

// POST /api/upgrade-simple - อัพเกรดแบบง่าย
router.post('/', async (req, res) => {
  const session = await User.startSession();

  try {
    const { userId, tier, paymentMethod, transactionId, amount, currency } = req.body;

    if (!userId || !tier || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // เริ่ม transaction
    session.startTransaction();

    // หา user และ plan
    const [user, plan] = await Promise.all([
      User.findById(userId).session(session),
      MembershipPlan.findOne({ tier, isActive: true }).session(session)
    ]);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!plan) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    // คำนวณวันหมดอายุ
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (plan.duration.days * 24 * 60 * 60 * 1000));

    // เก็บข้อมูลก่อนการอัพเดรดเพื่อ rollback ถ้าจำเป็น
    const userBeforeUpdate = {
      membershipTier: user.membership?.tier,
      membershipStartDate: user.membership?.startDate,
      membershipEndDate: user.membership?.endDate,
      coins: user.coins,
      dailyUsage: user.dailyUsage
    };

    // อัพเดตโดยใช้ transaction
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
      { new: true, runValidators: false, session } // ใช้ session สำหรับ transaction
    );

    // บันทึกประวัติการชำระเงินใน transaction เดียวกัน
    const paymentHistoryEntry = {
      tier: tier,
      amount: amount,
      currency: currency,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      status: 'completed',
      purchaseDate: new Date(),
      expiryDate: tier === 'member' ? null : endDate
    };

    updatedUser.paymentHistory.push(paymentHistoryEntry);
    await updatedUser.save({ session });

    // อัปเดตสถิติแพ็กเกจ
    plan.stats.totalPurchases += 1;
    plan.stats.totalRevenue += amount;
    await plan.save({ session });

    // ยืนยัน transaction
    await session.commitTransaction();

    // ส่ง Socket.IO event สำหรับอัพเดท membership แบบ real-time
    const io = req.app.get('io');
    if (io) {
      try {
        // อัพเดทข้อความเก่า
        const Message = require('../models/Message');
        await Message.updateMany(
          { 'sender': userId },
          { $set: { 'sender.membershipTier': tier } }
        ).session(session);

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
      } catch (socketError) {
        console.error('Error sending socket event:', socketError);
        // ไม่ให้ error นี้หยุดการทำงานของ transaction ที่สำเร็จแล้ว
      }
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
    // Rollback transaction ถ้ามี error
    if (session.inTransaction()) {
      await session.abortTransaction();
      console.log('🔄 Transaction rolled back due to error:', error.message);
    }

    console.error('Error upgrading membership:', error);

    // ถ้าเป็น error ที่เกี่ยวกับข้อมูลไม่ถูกต้อง ให้ return bad request
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data provided',
        error: error.message
      });
    }

    // ถ้าเป็น error อื่นๆ ให้ return internal server error
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade membership',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    // ปิด session
    await session.endSession();
  }
});

module.exports = router;
