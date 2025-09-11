const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const BlurTransaction = require('../models/BlurTransaction');

// GET /api/blur/user/:userId - ดูรูปที่เบลอของผู้ใช้
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { viewerId } = req.query; // ผู้ที่ต้องการดูรูป

    const user = await User.findById(userId).select('profileImages username displayName');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // กรองรูปที่เบลอ
    const blurredImages = user.profileImages.filter(img => img.isBlurred);

    // ถ้ามี viewerId ให้เช็คว่าซื้อรูปไหนไปแล้วบ้าง
    let purchasedImages = [];
    if (viewerId) {
      const transactions = await BlurTransaction.find({
        buyer: viewerId,
        imageOwner: userId,
        status: 'completed'
      }).select('imageId');
      
      purchasedImages = transactions.map(t => t.imageId);
    }

    // เตรียมข้อมูลรูป
    const imageData = blurredImages.map(img => ({
      id: img._id.toString(),
      url: img.url,
      isBlurred: true,
      isPurchased: purchasedImages.includes(img._id.toString()),
      cost: 10000 // ราคาคงที่ 10,000 เหรียญ
    }));

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName
        },
        images: imageData,
        totalBlurredImages: blurredImages.length
      }
    });

  } catch (error) {
    console.error('Error fetching blurred images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blurred images',
      error: error.message
    });
  }
});

// POST /api/blur/purchase - ซื้อรูปที่เบลอ
router.post('/purchase', async (req, res) => {
  try {
    const { buyerId, imageOwnerId, imageId } = req.body;

    if (!buyerId || !imageOwnerId || !imageId) {
      return res.status(400).json({
        success: false,
        message: 'Buyer ID, Image Owner ID, and Image ID are required'
      });
    }

    // ตรวจสอบว่าซื้อแล้วหรือยัง
    const existingTransaction = await BlurTransaction.findOne({
      buyer: buyerId,
      imageOwner: imageOwnerId,
      imageId: imageId,
      status: 'completed'
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'Image already purchased'
      });
    }

    // ดึงข้อมูลผู้ซื้อและเจ้าของรูป
    const [buyer, imageOwner] = await Promise.all([
      User.findById(buyerId),
      User.findById(imageOwnerId)
    ]);

    if (!buyer || !imageOwner) {
      return res.status(404).json({
        success: false,
        message: 'Buyer or image owner not found'
      });
    }

    // ตรวจสอบว่าไม่ใช่คนเดียวกัน
    if (buyerId === imageOwnerId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot purchase your own image'
      });
    }

    // ค้นหารูปที่ต้องการซื้อ
    const targetImage = imageOwner.profileImages.find(
      img => img._id.toString() === imageId && img.isBlurred
    );

    if (!targetImage) {
      return res.status(404).json({
        success: false,
        message: 'Blurred image not found'
      });
    }

    const cost = 10000;
    const ownerShare = 5000;
    const systemShare = 5000;

    // ตรวจสอบยอดเหรียญ
    if (buyer.coins < cost) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: cost,
        current: buyer.coins
      });
    }

    // ทำธุรกรรม
    buyer.coins -= cost;
    imageOwner.coins += ownerShare;

    // บันทึกธุรกรรม
    const transaction = new BlurTransaction({
      buyer: buyerId,
      imageOwner: imageOwnerId,
      imageId: imageId,
      imageUrl: targetImage.url,
      cost: cost,
      ownerShare: ownerShare,
      systemShare: systemShare,
      status: 'completed',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    // บันทึกทุกอย่าง
    await Promise.all([
      buyer.save(),
      imageOwner.save(),
      transaction.save()
    ]);

    res.json({
      success: true,
      message: 'Image purchased successfully',
      data: {
        transaction: {
          id: transaction._id,
          cost: cost,
          ownerShare: ownerShare,
          systemShare: systemShare
        },
        buyer: {
          remainingCoins: buyer.coins
        },
        imageOwner: {
          earnedCoins: ownerShare,
          totalCoins: imageOwner.coins
        },
        image: {
          id: imageId,
          url: targetImage.url
        }
      }
    });

  } catch (error) {
    console.error('Error purchasing blurred image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase image',
      error: error.message
    });
  }
});

// GET /api/blur/transactions/:userId - ดูประวัติการซื้อ/ขาย
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'all', page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (type === 'purchases') {
      query.buyer = userId;
    } else if (type === 'sales') {
      query.imageOwner = userId;
    } else {
      query = {
        $or: [
          { buyer: userId },
          { imageOwner: userId }
        ]
      };
    }

    const [transactions, total] = await Promise.all([
      BlurTransaction.find(query)
        .populate('buyer', 'username displayName')
        .populate('imageOwner', 'username displayName')
        .sort({ purchasedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      BlurTransaction.countDocuments(query)
    ]);

    // สรุปสถิติ
    const stats = await BlurTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [
                { $eq: ['$buyer', mongoose.Types.ObjectId(userId)] },
                '$cost',
                0
              ]
            }
          },
          totalEarned: {
            $sum: {
              $cond: [
                { $eq: ['$imageOwner', mongoose.Types.ObjectId(userId)] },
                '$ownerShare',
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          type: t.buyer._id.toString() === userId ? 'purchase' : 'sale',
          buyer: {
            id: t.buyer._id,
            username: t.buyer.username,
            displayName: t.buyer.displayName
          },
          imageOwner: {
            id: t.imageOwner._id,
            username: t.imageOwner.username,
            displayName: t.imageOwner.displayName
          },
          cost: t.cost,
          ownerShare: t.ownerShare,
          imageUrl: t.imageUrl,
          purchasedAt: t.purchasedAt,
          status: t.status
        })),
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          totalItems: total
        },
        stats: stats[0] || {
          totalTransactions: 0,
          totalSpent: 0,
          totalEarned: 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching blur transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

// GET /api/blur/stats - สถิติรวมของระบบ
router.get('/stats', async (req, res) => {
  try {
    const stats = await BlurTransaction.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalRevenue: { $sum: '$systemShare' },
          totalCoinsCirculated: { $sum: '$cost' },
          averageTransaction: { $avg: '$cost' }
        }
      }
    ]);

    const topBuyers = await BlurTransaction.aggregate([
      {
        $group: {
          _id: '$buyer',
          totalSpent: { $sum: '$cost' },
          totalPurchases: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          displayName: '$user.displayName',
          totalSpent: 1,
          totalPurchases: 1
        }
      }
    ]);

    const topSellers = await BlurTransaction.aggregate([
      {
        $group: {
          _id: '$imageOwner',
          totalEarned: { $sum: '$ownerShare' },
          totalSales: { $sum: 1 }
        }
      },
      { $sort: { totalEarned: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          displayName: '$user.displayName',
          totalEarned: 1,
          totalSales: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalTransactions: 0,
          totalRevenue: 0,
          totalCoinsCirculated: 0,
          averageTransaction: 0
        },
        topBuyers,
        topSellers
      }
    });

  } catch (error) {
    console.error('Error fetching blur stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

module.exports = router;
